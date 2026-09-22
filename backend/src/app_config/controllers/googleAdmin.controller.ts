import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";

import prisma from "../../db/prisma.js";
import { authProviders } from "../../generated/client/enums.js";
import { generateSessionToken } from "../../services/sessiontoken.js";

/**
 * Google admin signup/signin support, isolated under 'sppp confi'.
 *
 * The Google account email is the source of truth (verified with Google on the
 * server). If an Admin already owns the verified email the existing record is
 * authenticated; otherwise a NEW Admin record is created using the existing
 * Admin model. The Admin.password column is required, so Google-created admins
 * receive a cryptographically random, unusable bcrypt hash that is never
 * revealed and never usable for email/password login — Google OAuth is the only
 * way to authenticate such an account. No client-supplied role is trusted.
 */
class GoogleAdminError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "GoogleAdminError";
    this.status = status;
  }
}

const adminSafeSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  appConfigId: true,
  authprovider: true,
  profilepic: true,
} as const;

type GoogleTokenPayload = {
  email?: string;
  email_verified?: string | boolean;
  aud?: string;
  name?: string;
  picture?: string;
  error?: string;
};

async function verifyGoogleIdToken(idToken: string): Promise<GoogleTokenPayload> {
  const verificationRes = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
  );

  if (!verificationRes.ok) {
    throw new GoogleAdminError(401, "Google token verification failed");
  }

  const payload = (await verificationRes.json()) as GoogleTokenPayload;

  if (payload.error || !payload.email) {
    throw new GoogleAdminError(401, "Invalid Google token");
  }

  const verified =
    payload.email_verified === true || payload.email_verified === "true";
  if (!verified) {
    throw new GoogleAdminError(401, "Unverified Google account");
  }

  const googleClientId =
    process.env.GOOGLE_CLIENT_ID ?? process.env.AUTH_GOOGLE_ID;
  if (googleClientId && payload.aud !== googleClientId) {
    throw new GoogleAdminError(
      401,
      "Google token does not match this application"
    );
  }

  return payload;
}

function buildAdminUsername(email: string): string {
  const prefix = (email.split("@")[0] ?? "admin")
    .replace(/[^a-zA-Z0-9_.-]/g, "")
    .slice(0, 24);
  return prefix.length >= 3 ? prefix : `admin_${prefix || "user"}`.slice(0, 24);
}

async function createGoogleAdmin(
  email: string,
  name: string,
  profilepic: string | null
) {
  const username = buildAdminUsername(email);
  const unusablePassword = await bcrypt.hash(
    crypto.randomBytes(32).toString("hex"),
    10
  );

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const candidate =
      attempt === 0
        ? username
        : `${username}_${crypto.randomBytes(3).toString("hex")}`;
    try {
      return await prisma.admin.create({
        data: {
          email,
          username: candidate,
          name: name || email.split("@")[0] || email,
          password: unusablePassword,
          profilepic: profilepic ?? null,
          authprovider: authProviders.GOOGLE,
        },
        select: adminSafeSelect,
      });
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "P2002") continue; // username collision -> retry
      throw error;
    }
  }

  throw new GoogleAdminError(409, "Unable to create the admin account");
}

/**
 * Verifies the Google ID token and either authenticates an existing admin or
 * creates a NEW admin record from the verified Google identity. Returns a fresh
 * backend admin session token (role=admin) in both cases.
 */
export const authorizeOrCreateGoogleAdmin = async (
  req: Request,
  res: Response
) => {
  try {
    const { idToken } = (req.body ?? {}) as { idToken?: unknown };

    if (typeof idToken !== "string" || !idToken.trim()) {
      return res.status(400).json({ error: "Missing Google ID token" });
    }

    const payload = await verifyGoogleIdToken(idToken);
    const email = payload.email as string;

    const existing = await prisma.admin.findUnique({
      where: { email },
      select: adminSafeSelect,
    });

    const admin =
      existing ??
      (await createGoogleAdmin(
        email,
        payload.name ?? email.split("@")[0] ?? email,
        payload.picture ?? null
      ));

    const token = generateSessionToken(admin.id, "admin");

    return res.status(200).json({ ok: true, token, admin });
  } catch (error) {
    if (error instanceof GoogleAdminError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Google admin auth error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
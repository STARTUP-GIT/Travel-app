/**
 * Password reset service.
 *
 * Design decisions:
 * - Token is 32 random bytes, hex-encoded (64-character string).
 * - Only the SHA-256 hash of the raw token is stored in the database.
 * - Tokens expire after 1 hour (3600 seconds).
 * - Each new request invalidates any existing unused token for the same
 *   email address.
 * - The lookup is done by hash, so the raw token is never stored or logged.
 */

import { createHash, randomBytes } from "crypto";
import prisma from "../db/prisma.js";

/** Expire tokens after 1 hour. */
const TOKEN_TTL_MS = 60 * 60 * 1000;

export type Panel = "customer" | "provider";

/**
 * Maps the panel to the Prisma table that holds the account.
 * The provider panel covers all four service-provider types; we try each one
 * in sequence so a single endpoint can serve all of them.
 */
const USER_TABLES = {
  customer: ["user"] as const,
  provider: ["specific_guide", "common_guide", "hotel_owner", "restaurent_owner"] as const,
};

/** Generate a cryptographically secure token and return both forms. */
function generateToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Look up the email across all tables for the given panel.
 * Returns the table name, canonical email, and record id, or null if not found.
 */
async function findAccountByEmail(
  email: string,
  panel: Panel
): Promise<{ table: string; id: string; email: string; hasPassword: boolean } | null> {
  const tables = USER_TABLES[panel];
  if (!tables) return null;

  for (const table of tables) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = await (prisma as any)[table].findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, email: true, password: true },
    });

    if (record) {
      return {
        table,
        id: record.id,
        email: record.email,
        // Accounts created via Google have no password; they cannot use the
        // email/password reset flow.
        hasPassword: Boolean(record.password),
      };
    }
  }

  return null;
}

/**
 * Create a password reset token for the given email and panel.
 *
 * Always returns a generic success-like shape — callers must NOT reveal to the
 * caller whether the email address exists in the database.
 *
 * Returns the raw token (to be embedded in the email link) only when an actual
 * account was found and a token was stored.
 */
export async function createPasswordResetToken(
  email: string,
  panel: Panel
): Promise<{ rawToken: string | null }> {
  const account = await findAccountByEmail(email, panel);

  // No account (or a Google-only account) → return silently.
  if (!account || !account.hasPassword) {
    return { rawToken: null };
  }

  const { raw, hash } = generateToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  // Invalidate any existing unused token for this account first.
  await prisma.password_reset_token.deleteMany({
    where: {
      ownerEmail: account.email,
      panel,
      used: false,
    },
  });

  await prisma.password_reset_token.create({
    data: {
      ownerEmail: account.email,
      panel,
      tokenHash: hash,
      expiresAt,
      used: false,
    },
  });

  return { rawToken: raw };
}

/**
 * Verify whether a raw token is valid, unused, and not expired.
 */
export async function verifyResetToken(rawToken: string): Promise<boolean> {
  if (!rawToken || typeof rawToken !== "string" || rawToken.length !== 64) {
    return false;
  }
  const hash = hashToken(rawToken);
  const record = await prisma.password_reset_token.findUnique({
    where: { tokenHash: hash },
  });

  if (!record) return false;
  if (record.used) return false;
  if (record.expiresAt < new Date()) return false;

  return true;
}

/**
 * Validate a raw token, update the password, and mark the token as used.
 *
 * Returns `true` on success, `false` if the token is invalid, expired, or
 * already used. Never throws for expected failures.
 */
export async function resetPassword(
  rawToken: string,
  newHashedPassword: string
): Promise<boolean> {
  const hash = hashToken(rawToken);

  const record = await prisma.password_reset_token.findUnique({
    where: { tokenHash: hash },
  });

  if (!record) return false;
  if (record.used) return false;
  if (record.expiresAt < new Date()) return false;

  // Update the account's password.
  const { panel, ownerEmail } = record;
  const tables = USER_TABLES[panel as Panel];
  if (!tables) return false;

  let updated = false;
  for (const table of tables) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await (prisma as any)[table].findFirst({
      where: { email: { equals: ownerEmail, mode: "insensitive" } },
      select: { id: true, email: true },
    });
    if (existing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any)[table].update({
        where: { email: existing.email },
        data: { password: newHashedPassword },
      });
      updated = true;
      break;
    }
  }

  if (!updated) return false;

  // Mark the token as used (single-use guarantee).
  await prisma.password_reset_token.update({
    where: { tokenHash: hash },
    data: { used: true },
  });

  return true;
}

import prisma from "../../../../db/prisma.js";
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { ZodError } from 'zod';
import { generateSessionToken } from '../../../../services/sessiontoken.js';
import { authProviders } from "../../../../generated/client/enums.js";
import { adminSigninSchema, adminSignupSchema } from "../../../../services/zod.js";

const adminSafeSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  appConfigId: true,
  authprovider: true,
  profilepic: true,
} as const;

export const signUp = async (req: Request, res: Response) => {
  try {
    const { email, username, password, fullname } = adminSignupSchema.parse(req.body);

    const existingAdmin = await prisma.admin.findFirst({
      where: {
        OR: [
            { email: email },
            { username: username }
        ]
    }
    });
    
    if (existingAdmin) {
      return res.status(400).json({ error: 'Admin with this email or username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = await prisma.admin.create({
      data: {
        email,
        username,
        password: hashedPassword,
        name : fullname,
        authprovider: authProviders.EMAIL,
      },
      select: adminSafeSelect,
    });

    return res.status(201).json({
      message: 'Sign-up successful',
      admin: newAdmin,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
};


export const signIn = async (req: Request, res: Response) => {
  try {
    const { email, username, password } = adminSigninSchema.parse(req.body);

    const admin = await prisma.admin.findFirst({
      where: {
        OR: [
                { email: email },
                ...(username ? [{ username: username }] : []),
            ]
        }       
    });

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const token = await generateSessionToken(admin.id, "admin");

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return res.status(200).json({ message: 'Sign-in successful', token });


  }catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error});
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}


/**
 * Verifies a Google OAuth ID token (issued by Auth.js on the admin frontend)
 * and checks that the verified Google email matches an EXISTING admin account
 * in the admin table. Authorization is always decided by the backend — the
 * browser never supplies a role. On success it returns a fresh admin session
 * token (role=admin) which the admin frontend stores inside its encrypted
 * Auth.js session and attaches to proxied admin API calls.
 */
export const authorizeGoogleAdmin = async (req: Request, res: Response) => {
  try {
    const { idToken } = (req.body ?? {}) as { idToken?: unknown };

    if (typeof idToken !== 'string' || !idToken.trim()) {
      return res.status(400).json({ error: 'Missing Google ID token' });
    }

    // The backend is the source of truth: verify the token with Google before
    // trusting any email. Never reuse a client-supplied email/role.
    const verificationRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    );

    if (!verificationRes.ok) {
      return res.status(401).json({ error: 'Google token verification failed' });
    }

    const payload = (await verificationRes.json()) as {
      email?: string;
      email_verified?: string | boolean;
      aud?: string;
      error?: string;
    };

    if (payload.error || !payload.email) {
      return res.status(401).json({ error: 'Invalid Google token' });
    }

    const verified =
      payload.email_verified === true || payload.email_verified === 'true';
    if (!verified) {
      return res.status(401).json({ error: 'Unverified Google account' });
    }

    // Audience check when the backend has the Google client id configured.
    const googleClientId =
      process.env.GOOGLE_CLIENT_ID ?? process.env.AUTH_GOOGLE_ID;
    if (googleClientId && payload.aud !== googleClientId) {
      return res.status(401).json({ error: 'Google token does not match this application' });
    }

    // The verified email must correspond to an existing authorized admin.
    const admin = await prisma.admin.findUnique({
      where: { email: payload.email },
      select: adminSafeSelect,
    });

    if (!admin) {
      return res.status(403).json({ error: 'Not an authorized admin' });
    }

    const token = generateSessionToken(admin.id, 'admin');

    return res.status(200).json({ ok: true, token, admin });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
};


export const signOut = async (req: Request, res: Response) => {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return res.status(200).json({ message: 'Sign-out successful' });
  }catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
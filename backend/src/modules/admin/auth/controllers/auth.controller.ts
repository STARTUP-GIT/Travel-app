import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { ZodError } from 'zod';
import prisma from '../../../../db/prisma.js';
import {
  adminGoogleSigninSchema,
  adminGoogleSignupSchema,
  adminSigninSchema,
  adminSignupSchema,
} from '../../../../services/zod.js';
import { authProviders } from '../../../../generated/client/enums.js';
import { generateSessionToken } from '../../../../services/sessiontoken.js';

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
    const { email, username, password, fullname } =
      adminSignupSchema.parse(req.body);

    const adminExists = await prisma.admin.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (adminExists) {
      return res.status(400).json({ message: 'Admin already exists' });
    }

    const authprovider = authProviders.EMAIL;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const admin = await prisma.admin.create({
      data: {
        email,
        username,
        password: hashedPassword,
        name: fullname,
        authprovider,
      },
      select: adminSafeSelect,
    });

    res.status(201).json({
      message: 'Admin account created successfully',
      admin,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const googleSignUp = async (req: Request, res: Response) => {
  try {
    const { email, fullname, profilepic } =
      adminGoogleSignupSchema.parse(req.body);

    // Check if account already exists
    const adminExists = await prisma.admin.findUnique({
      where: {
        email,
      },
    });

    // Don't create another account
    if (adminExists) {
      return res.status(409).json({
        message: 'admin account already exists',
      });
    }

    // Generate username
    const baseUsername = (email.split('@')[0] ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '');

    let username = baseUsername;

    const usernameExists = await prisma.admin.findUnique({
      where: {
        username,
      },
    });

    if (usernameExists) {
      username = `${baseUsername}_${Date.now()}`;
    }

    // Create Google account
    const admin = await prisma.admin.create({
      data: {
        email,
        name: fullname,
        username,
        profilepic: profilepic ?? null,
        password: '',
        authprovider: authProviders.GOOGLE,
      },
      select: adminSafeSelect,
    });

    return res.status(201).json({
      message: 'Admin account created successfully',
      admin,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    console.error('Google signup error:', error);

    return res.status(500).json({
      message: 'Internal Server Error',
    });
  }
};

export const signIn = async (req: Request, res: Response) => {
  try {
    const { email, username, password } = adminSigninSchema.parse(req.body);

    const adminExists = await prisma.admin.findFirst({
      where: {
        OR: [{ email }, ...(username ? [{ username }] : [])],
      },
    });

    if (!adminExists) {
      return res.status(400).json({ message: 'admin does not exist' });
    }

    if (!adminExists.password) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    const isPasswordValid = await bcrypt.compare(password, adminExists.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    const token = await generateSessionToken(adminExists.id, 'admin');
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    res.status(200).json({ message: 'Admin signed in successfully', token });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const googleSignIn = async (req: Request, res: Response) => {
  try {
    const { email } = adminGoogleSigninSchema.parse(req.body);

    // Find existing account using Google email
    const adminExists = await prisma.admin.findUnique({
      where: {
        email,
      },
      select: adminSafeSelect,
    });

    // No account with this Google email
    if (!adminExists) {
      return res.status(404).json({
        message: 'Admin account does not exist.',
      });
    }

    // Generate JWT for existing admin
    const token = await generateSessionToken(adminExists.id, 'admin');

    // Store JWT in cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return res.status(200).json({
      message: 'Admin signed in successfully',
      token,
      admin: adminExists,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    console.error('Google signin error:', error);

    return res.status(500).json({
      message: 'Internal Server Error',
    });
  }
};

export const signOut = async (req: Request, res: Response) => {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return res.status(200).json({
      message: 'Admin signed out successfully',
    });
  } catch (error) {
    console.error('Sign out error:', error);

    return res.status(500).json({
      message: 'Internal Server Error',
    });
  }
};

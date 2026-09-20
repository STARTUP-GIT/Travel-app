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
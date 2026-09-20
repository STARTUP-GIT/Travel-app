import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { ZodError } from 'zod';
import prisma from '../../../../db/prisma.js';
import { userGoogleSigninSchema, userGoogleSignupSchema, usersigninSchema, usersignupSchema } from '../../../../services/zod.js';
import { authProviders } from '../../../../generated/client/enums.js';
import { generateSessionToken } from '../../../../services/sessiontoken.js';

const userSafeSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  phonenumber: true,
  profilepic: true,
  authprovider: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const signUp = async (req: Request, res: Response) => {
  try {

    const { email, username, password, fullname } = usersignupSchema.parse(req.body);

  
    const userExists = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });

    if (userExists) {
      return res.status(400).json({message:"User already exists"})
    }

    const authprovider = authProviders.EMAIL;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        name: fullname,
        phonenumber: "",
        authprovider
      }
    });


    res.status(201).json({ message: "User account created successfully" });

  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export const googleSignUp = async (req: Request, res: Response) => {
  try {
    const { email, fullname, profilepic } = userGoogleSignupSchema.parse(req.body);

    // Check if account already exists
    const userExists = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    // Don't create another account
    if (userExists) {
      return res.status(409).json({
        message: "user account already exists",
      });
    }

    // Generate username
    const baseUsername = (email
      .split("@")[0] ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "");

    let username = baseUsername;

    const usernameExists = await prisma.user.findUnique({
      where: {
        username,
      },
    });

    if (usernameExists) {
      username = `${baseUsername}_${Date.now()}`;
    }

    // Create Google account
    const user = await prisma.user.create({
      data: {
        email,
        name: fullname,
        username,
        profilepic: profilepic ?? null,
        password: "",
        phonenumber: "",
        authprovider: authProviders.GOOGLE,
      },
      select: userSafeSelect,
    });

    return res.status(201).json({
      message: "User account created successfully",
      user,
    });

  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    console.error("Google signup error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};



export const signIn = async (req: Request, res: Response) => {
  try {
    const { email, username, password } = usersigninSchema.parse(req.body);


    const userExists = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(username ? [{ username }] : []),
        ]
      }
    });

    if (!userExists) {
      return res.status(400).json({message : "user does not exist"})
    }

    if (!userExists.password) {
      return res.status(400).json("Invalid password");
    }

    const isPasswordValid = await bcrypt.compare(password, userExists.password);
    if (!isPasswordValid) {
      return res.status(400).json("Invalid password")
    }

    const token = generateSessionToken(userExists.id, "user");
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: 'strict' });

    res.status(200).json({ message: "User signed in successfully", token });

  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }  
  }
};



export const googleSignIn = async (req: Request, res: Response) => {
  try {
    const { email } = userGoogleSigninSchema.parse(req.body);

    // Find existing account using Google email
    const userExists = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    // No account with this Google email
    if (!userExists) {
      return res.status(404).json({
        message: "Account does not exist. .",
      });
    }

    // Generate JWT for existing user
    const token = generateSessionToken(userExists.id, "user");

    // Store JWT in cookie
    res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict"});

    return res.status(200).json({
      message: "User signed in successfully",
      token,
    });



  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    console.error("Google signin error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const signOut = async (req: Request, res: Response) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return res.status(200).json({
      message: "User signed out successfully",
    });
  } catch (error) {
    console.error("Sign out error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};
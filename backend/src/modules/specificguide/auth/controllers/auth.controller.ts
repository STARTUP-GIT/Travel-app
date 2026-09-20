import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { ZodError } from "zod";
import prisma from "../../../../db/prisma.js";
import {
  specific_guide_googleSigninSchema,
  specificGuideGoogleSignupSchema,
  specific_guide_signinSchema,
  specific_guide_signupSchema,
} from "../../../../services/zod.js";
import { authProviders } from "../../../../generated/client/enums.js";
import { generateSessionToken } from "../../../../services/sessiontoken.js";

const specificGuideSafeSelect = {
  id: true,
  full_name: true,
  username: true,
  email: true,
  phonenumber: true,
  profile_pic: true,
  tagline: true,
  authprovider: true,
  review: true,
  rating: true,
  description: true,
  placeid: true,
  isReported: true,
  experience: true,
  cost: true,
  language: true,
  createdAt: true,
  updatedAt: true,
} as const;




export const signUp = async (req: Request, res: Response) => {
  try {
    const data = specific_guide_signupSchema.parse(req.body);

    const specific_guide_exists = await prisma.specific_guide.findFirst({
      where: {
        OR: [
          { email: data.email },
          { username: data.username },
        ],
      },
    });

    if (specific_guide_exists) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const place = await prisma.place.findUnique({
      where: {
        id: data.placeid,
      },
      select: { id: true },
    });

    if (!place) {
      return res.status(400).json({
        message: "Place does not exist",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);

    const hashedPassword = await bcrypt.hash(data.password, salt);

    // Create specific guide
    const specific_guide = await prisma.specific_guide.create({
      data: {
        email: data.email,
        username: data.username,
        password: hashedPassword,
        full_name: data.fullname,
        phonenumber: data.phonenumber,
        profile_pic: data.profile_pic ?? "",
        placeid: data.placeid,
        experience: data.experience,
        cost: data.cost,
        language: data.language,
        authprovider: authProviders.EMAIL,
      },
      select: specificGuideSafeSelect,
    });

    return res.status(201).json({
      message: "Specific guide created successfully",
      specific_guide,
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

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }  
};


export const googleSignUp = async (req: Request, res: Response) => {
  try {
    const data = specificGuideGoogleSignupSchema.parse(req.body);

    // Check whether account already exists
    const specific_guide_exists = await prisma.specific_guide.findUnique({
      where: {
        email: data.email,
      },
    });

    // Do not create another account
    if (specific_guide_exists) {
      return res.status(409).json({
        message:
          "Account already exists",
      });
    }

    const place = await prisma.place.findUnique({
      where: {
        id: data.placeid,
      },
      select: { id: true },
    });

    if (!place) {
      return res.status(400).json({
        message: "Place does not exist",
      });
    }

    // Generate username from Google email
    const baseUsername =
      (data.email
        .split("@")[0] ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "") || "guide";

    let username = baseUsername;

    // Check username collision
    const usernameExists =
      await prisma.specific_guide.findUnique({
        where: {
          username,
        },
      });

    if (usernameExists) {
      username = `${baseUsername}_${Date.now()}`;
    }

    // Create Google guide
    const specific_guide = await prisma.specific_guide.create({
      data: {
        email: data.email,
        full_name: data.fullname,
        username,
        profile_pic: data.profilepic ?? "",
        phonenumber: data.phonenumber ?? "",
        password: "",
        placeid: data.placeid,
        experience: data.experience ?? 0,
        cost: data.cost ?? 0,
        language: data.language ?? [],
        authprovider: authProviders.GOOGLE,
      },
      select: specificGuideSafeSelect,
    });

    return res.status(201).json({
      message:
        "account created successfully.",
      specific_guide,
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
    const { email, username, password } = specific_guide_signinSchema.parse(req.body);

  
    const specific_guide_exists = await prisma.specific_guide.findFirst({
      where: {
        OR: [
          { email },
          ...(username ? [{ username }] : []),
        ]
      }
    });

    if (!specific_guide_exists) {
      return res.status(400).json("user does not exist")
    }

    if (!specific_guide_exists.password) {
      return res.status(400).json("Invalid password");
    }

    const isPasswordValid = await bcrypt.compare(password, specific_guide_exists.password);
    if (!isPasswordValid) {
      return res.status(400).json("Invalid password")
    }

    const token = generateSessionToken(specific_guide_exists.id, "specific_guide");
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

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};



export const googleSignIn = async (req: Request, res: Response) => {
  try {
    const { email } = specific_guide_googleSigninSchema.parse(req.body);

    // Find existing guide using email
    const specific_guide_exists = await prisma.specific_guide.findUnique({
      where: {
        email,
      },
    });

    // Account doesn't exist
    if (!specific_guide_exists) {
      return res.status(404).json({
        message:
          "Account does not exist.",
      });
    }

    // Generate JWT
    const token = generateSessionToken(specific_guide_exists.id, "specific_guide");

    // Store JWT in cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return res.status(200).json({
      message: "Google signin successful",
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



export const signOut = async (req: Request,res: Response) => {
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
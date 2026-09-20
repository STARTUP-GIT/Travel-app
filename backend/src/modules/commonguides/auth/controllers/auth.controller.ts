import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { ZodError } from "zod";
import prisma from "../../../../db/prisma.js";
import {
  common_guide_googleSigninSchema,
  commonGuideGoogleSignupSchema,
  common_guide_signinSchema,
  common_guide_signupSchema,
} from "../../../../services/zod.js";
import { authProviders } from "../../../../generated/client/enums.js";
import { generateSessionToken } from "../../../../services/sessiontoken.js";

const commonGuideSafeSelect = {
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
  isReported: true,
  experience: true,
  cost: true,
  language: true,
  createdAt: true,
  updatedAt: true,
} as const;

const verifyPlaces = async (placeIds: string[]) => {
  const uniquePlaceIds = [...new Set(placeIds)];

  const places = await prisma.place.findMany({
    where: {
      id: { in: uniquePlaceIds },
    },
    select: { id: true },
  });

  if (places.length !== uniquePlaceIds.length) {
    return null;
  }

  return uniquePlaceIds;
};




export const signUp = async (req: Request, res: Response) => {
  try {
    const data = common_guide_signupSchema.parse(req.body);

    const common_guide_exists = await prisma.common_guide.findFirst({
      where: {
        OR: [
          { email: data.email },
          { username: data.username },
        ],
      },
    });

    if (common_guide_exists) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const placeIds = await verifyPlaces(data.placeid);

    if (!placeIds) {
      return res.status(400).json({
        message: "One or more places do not exist",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);

    const hashedPassword = await bcrypt.hash(data.password, salt);

    // Create common guide along with its place associations
    const common_guide = await prisma.$transaction(async (tx) => {
      const guide = await tx.common_guide.create({
        data: {
          email: data.email,
          username: data.username,
          password: hashedPassword,
          full_name: data.fullname,
          phonenumber: data.phonenumber,
          profile_pic: data.profile_pic ?? "",
          experience: data.experience,
          cost: data.cost,
          language: data.language,
          authprovider: authProviders.EMAIL,
        },
        select: commonGuideSafeSelect,
      });

      if (placeIds.length > 0) {
        await tx.common_guide_places.createMany({
          data: placeIds.map((placeId) => ({
            placeId,
            commonGuideId: guide.id,
          })),
          skipDuplicates: true,
        });
      }

      return guide;
    });

    return res.status(201).json({
      message: "Common guide created successfully",
      common_guide,
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
    const data = commonGuideGoogleSignupSchema.parse(req.body);

    // Check whether account already exists
    const common_guide_exists = await prisma.common_guide.findUnique({
      where: {
        email: data.email,
      },
    });

    // Do not create another account
    if (common_guide_exists) {
      return res.status(409).json({
        message:
          "Account already exists",
      });
    }

    const placeIds = await verifyPlaces(data.placeid);

    if (!placeIds) {
      return res.status(400).json({
        message: "One or more places do not exist",
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
      await prisma.common_guide.findUnique({
        where: {
          username,
        },
      });

    if (usernameExists) {
      username = `${baseUsername}_${Date.now()}`;
    }

    // Create Google guide along with its place associations
    const common_guide = await prisma.$transaction(async (tx) => {
      const guide = await tx.common_guide.create({
        data: {
          email: data.email,
          full_name: data.fullname,
          username,
          profile_pic: data.profilepic ?? "",
          phonenumber: data.phonenumber ?? "",
          password: "",
          experience: data.experience ?? 0,
          cost: data.cost ?? 0,
          language: data.language ?? [],
          authprovider: authProviders.GOOGLE,
        },
        select: commonGuideSafeSelect,
      });

      if (placeIds.length > 0) {
        await tx.common_guide_places.createMany({
          data: placeIds.map((placeId) => ({
            placeId,
            commonGuideId: guide.id,
          })),
          skipDuplicates: true,
        });
      }

      return guide;
    });

    return res.status(201).json({
      message:
        "account created successfully.",
      common_guide,
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
    const { email, username, password } = common_guide_signinSchema.parse(req.body);

  
    const common_guide_exists = await prisma.common_guide.findFirst({
      where: {
        OR: [
          { email },
          ...(username ? [{ username }] : []),
        ]
      }
    });

    if (!common_guide_exists) {
      return res.status(400).json("user does not exist")
    }

    if (!common_guide_exists.password) {
      return res.status(400).json("Invalid password");
    }

    const isPasswordValid = await bcrypt.compare(password, common_guide_exists.password);
    if (!isPasswordValid) {
      return res.status(400).json("Invalid password")
    }

    const token = generateSessionToken(common_guide_exists.id, "common_guide");
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
    const { email } = common_guide_googleSigninSchema.parse(req.body);

    // Find existing guide using email
    const common_guide_exists = await prisma.common_guide.findUnique({
      where: {
        email,
      },
    });

    // Account doesn't exist
    if (!common_guide_exists) {
      return res.status(404).json({
        message:
          "Account does not exist.",
      });
    }

    // Generate JWT
    const token = generateSessionToken(common_guide_exists.id, "common_guide");

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
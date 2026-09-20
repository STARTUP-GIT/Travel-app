import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { ZodError } from "zod";
import prisma from "../../../../../db/prisma.js";
import {
  ownerSigninSchema,
  restaurentOwnerSignupSchema,
} from "../../../../../services/zod.js";
import { generateSessionToken } from "../../../../../services/sessiontoken.js";

const restaurentOwnerSafeSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  phone_number: true,
  profile_pic: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const signUp = async (req: Request, res: Response) => {
  try {
    const data = restaurentOwnerSignupSchema.parse(req.body);

    const existingOwner = await prisma.restaurent_owner.findFirst({
      where: {
        OR: [{ email: data.email }, { username: data.username }],
      },
    });

    if (existingOwner) {
      return res.status(400).json({
        message: "Restaurant owner already exists",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    const owner = await prisma.restaurent_owner.create({
      data: {
        name: data.name,
        username: data.username,
        email: data.email,
        password: hashedPassword,
        phone_number: data.phone_number,
        profile_pic: data.profile_pic ?? null,
      },
      select: restaurentOwnerSafeSelect,
    });

    return res.status(201).json({
      message: "Restaurant owner account created successfully",
      restaurent_owner: owner,
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

    console.error("Restaurant owner signup error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const signIn = async (req: Request, res: Response) => {
  try {
    const { email, password } = ownerSigninSchema.parse(req.body);

    const owner = await prisma.restaurent_owner.findUnique({
      where: { email },
    });

    if (!owner) {
      return res.status(404).json({
        message: "Restaurant owner not found",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, owner.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid password",
      });
    }

    const token = generateSessionToken(owner.id, "restaurent_owner");

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return res.status(200).json({
      message: "Restaurant owner signed in successfully",
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

    console.error("Restaurant owner signin error:", error);

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
      message: "Restaurant owner signed out successfully",
    });
  } catch (error) {
    console.error("Restaurant owner signout error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};
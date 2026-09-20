import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { ZodError } from "zod";
import prisma from "../../../../../db/prisma.js";
import {
  hotelOwnerSignupSchema,
  ownerSigninSchema,
} from "../../../../../services/zod.js";
import { generateSessionToken } from "../../../../../services/sessiontoken.js";

const hotelOwnerSafeSelect = {
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
    const data = hotelOwnerSignupSchema.parse(req.body);

    const existingOwner = await prisma.hotel_owner.findFirst({
      where: {
        OR: [{ email: data.email }, { username: data.username }],
      },
    });

    if (existingOwner) {
      return res.status(400).json({
        message: "Hotel owner already exists",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    const owner = await prisma.hotel_owner.create({
      data: {
        name: data.name,
        username: data.username,
        email: data.email,
        password: hashedPassword,
        phone_number: data.phone_number,
        profile_pic: data.profile_pic ?? null,
      },
      select: hotelOwnerSafeSelect,
    });

    return res.status(201).json({
      message: "Hotel owner account created successfully",
      hotel_owner: owner,
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

    console.error("Hotel owner signup error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const signIn = async (req: Request, res: Response) => {
  try {
    const { email, password } = ownerSigninSchema.parse(req.body);

    const owner = await prisma.hotel_owner.findUnique({
      where: { email },
    });

    if (!owner) {
      return res.status(404).json({
        message: "Hotel owner not found",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, owner.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid password",
      });
    }

    const token = generateSessionToken(owner.id, "hotel_owner");

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return res.status(200).json({
      message: "Hotel owner signed in successfully",
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

    console.error("Hotel owner signin error:", error);

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
      message: "Hotel owner signed out successfully",
    });
  } catch (error) {
    console.error("Hotel owner signout error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};
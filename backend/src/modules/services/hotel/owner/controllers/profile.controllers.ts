import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { ZodError } from "zod";
import prisma from "../../../../../db/prisma.js";
import { hotelOwnerProfileUpdateSchema } from "../../../../../services/zod.js";

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

export const getProfile = async (req: Request, res: Response) => {
  try {
    const ownerId = req.hotel_owner;

    if (!ownerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const owner = await prisma.hotel_owner.findUnique({
      where: { id: ownerId },
      select: hotelOwnerSafeSelect,
    });

    if (!owner) {
      return res.status(404).json({
        message: "Hotel owner not found",
      });
    }

    return res.status(200).json({
      hotel_owner: owner,
    });
  } catch (error) {
    console.error("Get hotel owner profile error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const editProfile = async (req: Request, res: Response) => {
  try {
    const ownerId = req.hotel_owner;

    if (!ownerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const data = hotelOwnerProfileUpdateSchema.parse(req.body);

    const owner = await prisma.hotel_owner.findUnique({
      where: { id: ownerId },
    });

    if (!owner) {
      return res.status(404).json({
        message: "Hotel owner not found",
      });
    }

    if (data.email !== undefined) {
      const existingEmail = await prisma.hotel_owner.findFirst({
        where: { email: data.email },
      });

      if (existingEmail && existingEmail.id !== ownerId) {
        return res.status(400).json({
          message: "Email already exists",
        });
      }
    }

    if (data.username !== undefined) {
      const existingUsername = await prisma.hotel_owner.findFirst({
        where: { username: data.username },
      });

      if (existingUsername && existingUsername.id !== ownerId) {
        return res.status(400).json({
          message: "Username already exists",
        });
      }
    }

    let hashedPassword: string | undefined;

    if (data.password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(data.password, salt);
    }

    const updatedOwner = await prisma.hotel_owner.update({
      where: { id: ownerId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.username !== undefined ? { username: data.username } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.phone_number !== undefined ? { phone_number: data.phone_number } : {}),
        ...(data.profile_pic !== undefined ? { profile_pic: data.profile_pic } : {}),
        ...(hashedPassword !== undefined ? { password: hashedPassword } : {}),
      },
      select: hotelOwnerSafeSelect,
    });

    return res.status(200).json({
      message: "Profile updated successfully",
      hotel_owner: updatedOwner,
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

    console.error("Edit hotel owner profile error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const deleteProfile = async (req: Request, res: Response) => {
  try {
    const ownerId = req.hotel_owner;

    if (!ownerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const owner = await prisma.hotel_owner.findUnique({
      where: { id: ownerId },
    });

    if (!owner) {
      return res.status(404).json({
        message: "Hotel owner not found",
      });
    }

    await prisma.hotel_owner.delete({
      where: { id: ownerId },
    });

    return res.status(200).json({
      message: "Profile deleted successfully",
    });
  } catch (error) {
    console.error("Delete hotel owner profile error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};
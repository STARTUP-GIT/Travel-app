import type { Request, Response } from "express";
import prisma from "../../../../db/prisma.js";
import bcrypt from "bcryptjs";
import { ZodError } from "zod";
import { adminProfileUpdateSchema } from "../../../../services/zod.js";

const adminSafeSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  appConfigId: true,
  authprovider: true,
  profilepic: true,
} as const;

export const getProfile = async (req: Request, res: Response) => {
  try {
    const adminId = req.admin;

    if (!adminId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const admin = await prisma.admin.findUnique({
      where: {
        id: adminId,
      },
      select: adminSafeSelect,
    });

    if (!admin) {
      return res.status(404).json({
        message: "Admin not found",
      });
    }

    return res.status(200).json({
      admin,
    });
  } catch (error) {
    console.error("Get profile error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const editProfile = async (req: Request, res: Response) => {
  try {
    const adminId = req.admin;

    if (!adminId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const data = adminProfileUpdateSchema.parse(req.body);

    const existingAdmin = await prisma.admin.findFirst({
      where: {
        ...(data.email !== undefined ? { email: data.email } : {}),
      },
    });

    if (existingAdmin && existingAdmin.id !== adminId) {
      return res.status(400).json({
        message: "Email already exists",
      });
    }

    const existingUsername = await prisma.admin.findFirst({
      where: {
        ...(data.username !== undefined ? { username: data.username } : {}),
      },
    });

    if (existingUsername && existingUsername.id !== adminId) {
      return res.status(400).json({
        message: "Username already exists",
      });
    }

    let hashedPassword: string | undefined;

    if (data.password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(data.password, salt);
    }

    const updatedAdmin = await prisma.admin.update({
      where: {
        id: adminId,
      },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.username !== undefined ? { username: data.username } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.profilepic !== undefined ? { profilepic: data.profilepic } : {}),
        ...(hashedPassword !== undefined ? { password: hashedPassword } : {}),
      },
      select: adminSafeSelect,
    });

    return res.status(200).json({
      message: "Profile updated successfully",
      admin: updatedAdmin,
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

    console.error("Edit profile error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const deleteProfile = async (req: Request, res: Response) => {
  try {
    const adminId = req.admin;

    if (!adminId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const admin = await prisma.admin.findUnique({
      where: {
        id: adminId,
      },
    });

    if (!admin) {
      return res.status(404).json({
        message: "Admin not found",
      });
    }

    await prisma.admin.delete({
      where: {
        id: adminId,
      },
    });

    return res.status(200).json({
      message: "Profile deleted successfully",
    });
  } catch (error) {
    console.error("Delete profile error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};
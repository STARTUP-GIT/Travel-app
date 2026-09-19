import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../../../../db/prisma.js";

export const getProfile = async (req: Request, res: Response) => {
  try {
    const specificGuideId = req.specific_guide;

    const specificGuide = await prisma.specific_guide.findUnique({
      where: {
        id: specificGuideId,
      },
    });

    if (!specificGuide) {
      return res.status(404).json({
        message: "Specific guide not found",
      });
    }

    return res.status(200).json({
      user: specificGuide,
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
    const specificGuideId = req.specific_guide;

    const specificGuide = await prisma.specific_guide.findUnique({
      where: {
        id: specificGuideId,
      },
    });

    if (!specificGuide) {
      return res.status(404).json({
        message: "Specific guide not found",
      });
    }

    const {
      full_name,
      username,
      phonenumber,
      profile_pic,
      password,
      email,
      tagline,
      description,
      experience,
      cost,
      language,
    } = req.body;

    const existingEmail = await prisma.specific_guide.findFirst({
      where: {
        email,
      },
    });

    if (existingEmail && existingEmail.id !== specificGuideId) {
      return res.status(400).json({
        message: "Email already exists",
      });
    }

    const existingUsername = await prisma.specific_guide.findFirst({
      where: {
        username,
      },
    });

    if (existingUsername && existingUsername.id !== specificGuideId) {
      return res.status(400).json({
        message: "Username already exists",
      });
    }

    let hashedPassword: string | undefined;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    const updatedGuide = await prisma.specific_guide.update({
      where: {
        id: specificGuideId,
      },
      data: {
        full_name,
        username,
        email,
        phonenumber,
        profile_pic,
        tagline,
        description,
        experience,
        cost,
        language,

        ...(hashedPassword && {
          password: hashedPassword,
        }),
      },
    });

    return res.status(200).json({
      message: "Profile updated successfully",
      user: updatedGuide,
    });
  } catch (error) {
    console.error("Edit profile error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const deleteProfile = async (req: Request, res: Response) => {
  try {
    const specificGuideId = req.specific_guide;

    const specificGuide = await prisma.specific_guide.findUnique({
      where: {
        id: specificGuideId,
      },
    });

    if (!specificGuide) {
      return res.status(404).json({
        message: "Specific guide not found",
      });
    }

    await prisma.specific_guide.delete({
      where: {
        id: specificGuideId,
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
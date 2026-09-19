import type { Request, Response } from "express";
import prisma from "../../../../db/prisma.js";
import bcrypt from "bcryptjs";

export const getProfile = async (req: Request, res: Response) => {
  try {
    const commonGuideId = req.common_guide;

    const commonGuide = await prisma.common_guide.findUnique({
      where: {
        id: commonGuideId,
      },
    });

    if (!commonGuide) {
      return res.status(404).json({
        message: "Common guide not found",
      });
    }

    return res.status(200).json({
      common_guide: commonGuide,
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
    const commonGuideId = req.common_guide;

    const commonGuide = await prisma.common_guide.findUnique({
      where: {
        id: commonGuideId,
      },
    });

    if (!commonGuide) {
      return res.status(404).json({
        message: "Common guide not found",
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

    const existingEmail = await prisma.common_guide.findFirst({
      where: {
        email,
      },
    });

    if (existingEmail && existingEmail.id !== commonGuideId) {
      return res.status(400).json({
        message: "Email already exists",
      });
    }

    const existingUsername = await prisma.common_guide.findFirst({
      where: {
        username,
      },
    });

    if (existingUsername && existingUsername.id !== commonGuideId) {
      return res.status(400).json({
        message: "Username already exists",
      });
    }

    let hashedPassword: string | undefined;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    const updatedCommonGuide = await prisma.common_guide.update({
      where: {
        id: commonGuideId,
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
      common_guide: updatedCommonGuide,
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
    const commonGuideId = req.common_guide;

    const commonGuide = await prisma.common_guide.findUnique({
      where: {
        id: commonGuideId,
      },
    });

    if (!commonGuide) {
      return res.status(404).json({
        message: "Common guide not found",
      });
    }

    await prisma.common_guide.delete({
      where: {
        id: commonGuideId,
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
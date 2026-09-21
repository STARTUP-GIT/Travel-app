import type { Request, Response } from "express";
import prisma from "../../../../db/prisma.js";
import bcrypt from "bcryptjs";
import { ZodError } from "zod";
import {
  commonGuideProfileUpdateSchema,
  guideBookingStatusSchema,
} from "../../../../services/zod.js";

const userSafeSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  phonenumber: true,
  profilepic: true,
} as const;

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

export const getProfile = async (req: Request, res: Response) => {
  try {
    const commonGuideId = req.common_guide;

    if (!commonGuideId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const commonGuide = await prisma.common_guide.findUnique({
      where: {
        id: commonGuideId,
      },
      select: commonGuideSafeSelect,
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

    if (!commonGuideId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const data = commonGuideProfileUpdateSchema.parse(req.body);

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

    const existingEmail = await prisma.common_guide.findFirst({
      where: {
        ...(data.email !== undefined ? { email: data.email } : {}),
      },
    });

    if (existingEmail && existingEmail.id !== commonGuideId) {
      return res.status(400).json({
        message: "Email already exists",
      });
    }

    const existingUsername = await prisma.common_guide.findFirst({
      where: {
        ...(data.username !== undefined ? { username: data.username } : {}),
      },
    });

    if (existingUsername && existingUsername.id !== commonGuideId) {
      return res.status(400).json({
        message: "Username already exists",
      });
    }

    let hashedPassword: string | undefined;

    if (data.password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(data.password, salt);
    }

    const updatedCommonGuide = await prisma.common_guide.update({
      where: {
        id: commonGuideId,
      },
      data: {
        ...(data.full_name !== undefined ? { full_name: data.full_name } : {}),
        ...(data.username !== undefined ? { username: data.username } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.phonenumber !== undefined ? { phonenumber: data.phonenumber } : {}),
        ...(data.profile_pic !== undefined ? { profile_pic: data.profile_pic } : {}),
        ...(data.tagline !== undefined ? { tagline: data.tagline } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.experience !== undefined ? { experience: data.experience } : {}),
        ...(data.cost !== undefined ? { cost: data.cost } : {}),
        ...(data.language !== undefined ? { language: data.language } : {}),
        ...(hashedPassword !== undefined ? { password: hashedPassword } : {}),
      },
      select: commonGuideSafeSelect,
    });

    return res.status(200).json({
      message: "Profile updated successfully",
      common_guide: updatedCommonGuide,
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
    const commonGuideId = req.common_guide;

    if (!commonGuideId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

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

export const getBookings = async (req: Request, res: Response) => {
  try {
    const commonGuideId = req.common_guide;

    if (!commonGuideId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const bookings = await prisma.common_guide_booking.findMany({
      where: {
        commonGuideId,
      },
      include: {
        user: { select: userSafeSelect },
        selectedPlaces: { include: { place: true } },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json(
      bookings.map((booking: (typeof bookings)[number]) => ({
        ...booking,
        numberOfPlaces: booking.selectedPlaces.length,
      }))
    );
  } catch (error) {
    console.error("Get common guide bookings error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const updateBookingStatus = async (req: Request, res: Response) => {
  try {
    const commonGuideId = req.common_guide;

    if (!commonGuideId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { bookingId } = req.params as { bookingId: string };

    const status = guideBookingStatusSchema.parse(req.body);

    const booking = await prisma.common_guide_booking.findUnique({
      where: {
        id: bookingId,
      },
    });

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    if (booking.commonGuideId !== commonGuideId) {
      return res.status(403).json({
        message: "Forbidden",
      });
    }

    const updatedBooking = await prisma.common_guide_booking.update({
      where: {
        id: bookingId,
      },
      data: { status },
      include: {
        user: { select: userSafeSelect },
        selectedPlaces: { include: { place: true } },
      },
    });

    return res.status(200).json({
      message: "Booking status updated successfully",
      numberOfPlaces: updatedBooking.selectedPlaces.length,
      booking: updatedBooking,
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

    console.error("Update common guide booking status error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};
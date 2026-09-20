import type { Request, Response } from "express";
import { ZodError } from "zod";
import prisma from "../../../../../db/prisma.js";
import {
  hotelCreateSchema,
  hotelUpdateSchema,
} from "../../../../../services/zod.js";

const districtHierarchyInclude = {
  district: {
    include: {
      state: {
        include: {
          country: true,
        },
      },
    },
  },
} as const;

export const createHotel = async (req: Request, res: Response) => {
  try {
    const ownerId = req.hotel_owner;

    if (!ownerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const data = hotelCreateSchema.parse(req.body);

    const district = await prisma.district.findUnique({
      where: { id: data.districtId },
      select: { id: true },
    });

    if (!district) {
      return res.status(400).json({
        message: "District does not exist",
      });
    }

    const hotel = await prisma.hotel.create({
      data: {
        name: data.name,
        address: data.address,
        profile_logo: data.profile_logo,
        districtId: data.districtId,
        description: data.description ?? null,
        rating: data.rating,
        review: data.review ?? [],
        cost_per_night: data.cost_per_night,
        images: data.images ?? [],
        latitude: data.latitude,
        longitude: data.longitude,
        ...(data.phone_number !== undefined ? { phone_number: data.phone_number } : {}),
        ...(data.whatsapp_number !== undefined ? { whatsapp_number: data.whatsapp_number } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.website !== undefined ? { website: data.website } : {}),
        ...(data.booking_enabled !== undefined ? { booking_enabled: data.booking_enabled } : {}),
        hotelOwnerId: ownerId,
      },
      include: districtHierarchyInclude,
    });

    return res.status(201).json({
      message: "Hotel created successfully",
      hotel,
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

    console.error("Create hotel error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const getAllHotels = async (req: Request, res: Response) => {
  try {
    const hotels = await prisma.hotel.findMany({
      include: districtHierarchyInclude,
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(hotels);
  } catch (error) {
    console.error("Get all hotels error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const getHotelById = async (req: Request, res: Response) => {
  try {
    const { hotelId } = req.params as { hotelId: string };

    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      include: districtHierarchyInclude,
    });

    if (!hotel) {
      return res.status(404).json({
        message: "Hotel not found",
      });
    }

    return res.status(200).json(hotel);
  } catch (error) {
    console.error("Get hotel by id error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const updateHotel = async (req: Request, res: Response) => {
  try {
    const ownerId = req.hotel_owner;

    if (!ownerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { hotelId } = req.params as { hotelId: string };

    const existingHotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { hotelOwnerId: true },
    });

    if (!existingHotel) {
      return res.status(404).json({
        message: "Hotel not found",
      });
    }

    if (existingHotel.hotelOwnerId !== ownerId) {
      return res.status(403).json({
        message: "Forbidden",
      });
    }

    const data = hotelUpdateSchema.parse(req.body);

    const hotel = await prisma.hotel.update({
      where: { id: hotelId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.profile_logo !== undefined ? { profile_logo: data.profile_logo } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.rating !== undefined ? { rating: data.rating } : {}),
        ...(data.review !== undefined ? { review: data.review } : {}),
        ...(data.cost_per_night !== undefined ? { cost_per_night: data.cost_per_night } : {}),
        ...(data.images !== undefined ? { images: data.images } : {}),
        ...(data.latitude !== undefined ? { latitude: data.latitude } : {}),
        ...(data.longitude !== undefined ? { longitude: data.longitude } : {}),
        ...(data.phone_number !== undefined ? { phone_number: data.phone_number } : {}),
        ...(data.whatsapp_number !== undefined ? { whatsapp_number: data.whatsapp_number } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.website !== undefined ? { website: data.website } : {}),
        ...(data.booking_enabled !== undefined ? { booking_enabled: data.booking_enabled } : {}),
      },
      include: districtHierarchyInclude,
    });

    return res.status(200).json({
      message: "Hotel updated successfully",
      hotel,
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

    console.error("Update hotel error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const deleteHotel = async (req: Request, res: Response) => {
  try {
    const ownerId = req.hotel_owner;

    if (!ownerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { hotelId } = req.params as { hotelId: string };

    const existingHotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { hotelOwnerId: true },
    });

    if (!existingHotel) {
      return res.status(404).json({
        message: "Hotel not found",
      });
    }

    if (existingHotel.hotelOwnerId !== ownerId) {
      return res.status(403).json({
        message: "Forbidden",
      });
    }

    await prisma.hotel.delete({
      where: { id: hotelId },
    });

    return res.status(200).json({
      message: "Hotel deleted successfully",
    });
  } catch (error) {
    console.error("Delete hotel error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const getMyHotels = async (req: Request, res: Response) => {
  try {
    const ownerId = req.hotel_owner;

    if (!ownerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const hotels = await prisma.hotel.findMany({
      where: { hotelOwnerId: ownerId },
      include: districtHierarchyInclude,
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(hotels);
  } catch (error) {
    console.error("Get my hotels error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};
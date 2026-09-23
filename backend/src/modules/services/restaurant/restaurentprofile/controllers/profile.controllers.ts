import type { Request, Response } from "express";
import { ZodError } from "zod";
import prisma from "../../../../../db/prisma.js";
import {
  restaurentCreateSchema,
  restaurentUpdateSchema,
} from "../../../../../services/zod.js";
import { Food_Category } from "../../../../../generated/client/enums.js";

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

export const createRestaurent = async (req: Request, res: Response) => {
  try {
    const ownerId = req.restaurent_owner;

    if (!ownerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const data = restaurentCreateSchema.parse(req.body);

    const district = await prisma.district.findUnique({
      where: { id: data.districtId },
      select: { id: true },
    });

    if (!district) {
      return res.status(400).json({
        message: "District does not exist",
      });
    }

    const restaurent = await prisma.restaurent.create({
      data: {
        name: data.name,
        address: data.address,
        profile_logo: data.profile_logo,
        districtId: data.districtId,
        description: data.description ?? null,
        rating: data.rating,
        review: data.review ?? [],
        menu: data.menu ?? [],
        food_category: data.food_category ?? Food_Category.VEG_AND_NONVEG,
        images: data.images ?? [],
        latitude: data.latitude,
        longitude: data.longitude,
        status: "PENDING",
        ...(data.phone_number !== undefined ? { phone_number: data.phone_number } : {}),
        ...(data.whatsapp_number !== undefined ? { whatsapp_number: data.whatsapp_number } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.website !== undefined ? { website: data.website } : {}),
        ...(data.booking_enabled !== undefined ? { booking_enabled: data.booking_enabled } : {}),
        restaurentOwnerId: ownerId,
      },
      include: districtHierarchyInclude,
    });

    return res.status(201).json({
      message: "Restaurant created successfully",
      restaurent,
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

    console.error("Create restaurant error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const getAllRestaurents = async (req: Request, res: Response) => {
  try {
    const restaurents = await prisma.restaurent.findMany({
      where: {
        status: "APPROVED",
        district: {
          isServiceAvailable: true,
          state: { isServiceAvailable: true },
        },
      },
      include: districtHierarchyInclude,
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(restaurents);
  } catch (error) {
    console.error("Get all restaurants error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const getRestaurentById = async (req: Request, res: Response) => {
  try {
    const { restaurentId } = req.params as { restaurentId: string };

    const restaurent = await prisma.restaurent.findUnique({
      where: { id: restaurentId },
      include: districtHierarchyInclude,
    });

    if (restaurent && restaurent.status !== "APPROVED") {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    if (!restaurent) {
      return res.status(404).json({
        message: "Restaurant not found",
      });
    }

    return res.status(200).json(restaurent);
  } catch (error) {
    console.error("Get restaurant by id error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const updateRestaurent = async (req: Request, res: Response) => {
  try {
    const ownerId = req.restaurent_owner;

    if (!ownerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { restaurentId } = req.params as { restaurentId: string };

    const existingRestaurent = await prisma.restaurent.findUnique({
      where: { id: restaurentId },
      select: { restaurentOwnerId: true },
    });

    if (!existingRestaurent) {
      return res.status(404).json({
        message: "Restaurant not found",
      });
    }

    if (existingRestaurent.restaurentOwnerId !== ownerId) {
      return res.status(403).json({
        message: "Forbidden",
      });
    }

    const data = restaurentUpdateSchema.parse(req.body);

    const restaurent = await prisma.restaurent.update({
      where: { id: restaurentId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.profile_logo !== undefined ? { profile_logo: data.profile_logo } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.rating !== undefined ? { rating: data.rating } : {}),
        ...(data.review !== undefined ? { review: data.review } : {}),
        ...(data.menu !== undefined ? { menu: data.menu } : {}),
        ...(data.food_category !== undefined ? { food_category: data.food_category } : {}),
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
      message: "Restaurant updated successfully",
      restaurent,
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

    console.error("Update restaurant error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const deleteRestaurent = async (req: Request, res: Response) => {
  try {
    const ownerId = req.restaurent_owner;

    if (!ownerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { restaurentId } = req.params as { restaurentId: string };

    const existingRestaurent = await prisma.restaurent.findUnique({
      where: { id: restaurentId },
      select: { restaurentOwnerId: true },
    });

    if (!existingRestaurent) {
      return res.status(404).json({
        message: "Restaurant not found",
      });
    }

    if (existingRestaurent.restaurentOwnerId !== ownerId) {
      return res.status(403).json({
        message: "Forbidden",
      });
    }

    await prisma.restaurent.delete({
      where: { id: restaurentId },
    });

    return res.status(200).json({
      message: "Restaurant deleted successfully",
    });
  } catch (error) {
    console.error("Delete restaurant error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const getMyRestaurents = async (req: Request, res: Response) => {
  try {
    const ownerId = req.restaurent_owner;

    if (!ownerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const restaurents = await prisma.restaurent.findMany({
      where: { restaurentOwnerId: ownerId },
      include: districtHierarchyInclude,
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(restaurents);
  } catch (error) {
    console.error("Get my restaurants error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};
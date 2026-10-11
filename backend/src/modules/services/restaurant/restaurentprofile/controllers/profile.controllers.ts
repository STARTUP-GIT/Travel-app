import type { Request, Response } from "express";
import { ZodError } from "zod";
import prisma from "../../../../../db/prisma.js";
import {
  restaurentCreateSchema,
  restaurentUpdateSchema,
} from "../../../../../services/zod.js";
import { Food_Category } from "../../../../../generated/client/enums.js";
import { resolveInitialStatus } from "../../../../../services/approvalSettings.js";
import { resolveGoogleMapsShortLink } from "../../../../../app_config/services/location-resolver.js";

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

const restaurantFullInclude = {
  ...districtHierarchyInclude,
  dishes: {
    orderBy: { displayOrder: "asc" as const },
  },
  branches: {
    include: {
      ...districtHierarchyInclude,
      dishes: true,
    },
    orderBy: { createdAt: "asc" as const },
  },
  parent_restaurant: {
    include: districtHierarchyInclude,
  },
} as const;

export async function validateDistrictAndState(districtId: string, stateId?: string) {
  const district = await prisma.district.findUnique({
    where: { id: districtId },
    include: { state: true },
  });

  if (!district) {
    return { valid: false, error: "District does not exist" };
  }

  if (!district.isServiceAvailable || !district.state?.isServiceAvailable) {
    return { valid: false, error: "Selected district is not currently enabled for services" };
  }

  if (stateId && district.stateId !== stateId) {
    return { valid: false, error: "Selected district does not belong to the selected state" };
  }

  return { valid: true, district };
}

export const createRestaurent = async (req: Request, res: Response) => {
  try {
    const ownerId = req.restaurent_owner;

    if (!ownerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const data = restaurentCreateSchema.parse(req.body);

    const districtCheck = await validateDistrictAndState(data.districtId, data.stateId);
    if (!districtCheck.valid) {
      return res.status(400).json({ message: districtCheck.error });
    }

    let latitude = data.latitude ?? 0;
    let longitude = data.longitude ?? 0;

    if (data.maps_url && data.maps_url.trim()) {
      try {
        const coords = await resolveGoogleMapsShortLink(data.maps_url.trim());
        latitude = coords.latitude;
        longitude = coords.longitude;
      } catch {
        return res.status(422).json({
          message: "Could not determine coordinates from the provided Google Maps link. Please verify the sharing link.",
        });
      }
    }

    // Backend validation for branches
    if (data.has_branches && data.branches && data.branches.length > 0) {
      for (const branch of data.branches) {
        if (branch.name.trim() !== data.name.trim()) {
          return res.status(400).json({
            message: `Branch name "${branch.name}" does not match the parent restaurant name "${data.name}". Every branch must use the exact parent restaurant name.`,
          });
        }
        const bCheck = await validateDistrictAndState(branch.districtId, branch.stateId);
        if (!bCheck.valid) {
          return res.status(400).json({
            message: `Branch location error: ${bCheck.error}`,
          });
        }
      }
    }

    // Admin auto-approval policy decides whether a new listing goes live straight away
    const initialStatus = await resolveInitialStatus("restaurants");

    const menuStrings = data.dishes?.length
      ? data.dishes.map((d) => d.name)
      : data.menu ?? [];

    const restaurent = await prisma.restaurent.create({
      data: {
        name: data.name,
        address: data.address,
        profile_logo: data.profile_logo,
        districtId: data.districtId,
        description: data.description ?? null,
        rating: data.rating ?? 0,
        review: data.review ?? [],
        menu: menuStrings,
        food_category: data.food_category ?? Food_Category.VEG_AND_NONVEG,
        images: data.images ?? [],
        latitude,
        longitude,
        status: initialStatus,
        maps_url: data.maps_url ?? null,
        opening_time: data.opening_time ?? null,
        closing_time: data.closing_time ?? null,
        has_branches: data.has_branches ?? false,
        ...(data.phone_number !== undefined ? { phone_number: data.phone_number || null } : {}),
        ...(data.whatsapp_number !== undefined ? { whatsapp_number: data.whatsapp_number || null } : {}),
        ...(data.email !== undefined ? { email: data.email || null } : {}),
        ...(data.website !== undefined ? { website: data.website || null } : {}),
        ...(data.booking_enabled !== undefined ? { booking_enabled: data.booking_enabled } : {}),
        restaurentOwnerId: ownerId,
      },
    });

    // Create dishes
    if (data.dishes && data.dishes.length > 0) {
      await prisma.restaurant_dish.createMany({
        data: data.dishes.map((dish, idx) => ({
          restaurantId: restaurent.id,
          name: dish.name,
          description: dish.description ?? null,
          foodCategory: dish.foodCategory ?? Food_Category.VEG_AND_NONVEG,
          price: dish.price ?? null,
          image: dish.image ?? null,
          isAvailable: dish.isAvailable ?? true,
          displayOrder: dish.displayOrder ?? idx,
        })),
      });
    }

    // Create branches
    if (data.has_branches && data.branches && data.branches.length > 0) {
      for (const branch of data.branches) {
        let bLat = branch.latitude ?? 0;
        let bLng = branch.longitude ?? 0;
        if (branch.maps_url && branch.maps_url.trim()) {
          try {
            const bCoords = await resolveGoogleMapsShortLink(branch.maps_url.trim());
            bLat = bCoords.latitude;
            bLng = bCoords.longitude;
          } catch {
            // keep existing or provided coords
          }
        }

        await prisma.restaurent.create({
          data: {
            name: data.name, // Exactly matches parent name
            address: branch.address,
            profile_logo: branch.profile_logo || data.profile_logo,
            districtId: branch.districtId,
            description: data.description ?? null,
            rating: 0,
            review: [],
            menu: menuStrings,
            food_category: data.food_category ?? Food_Category.VEG_AND_NONVEG,
            images: branch.images?.length ? branch.images : data.images ?? [],
            latitude: bLat,
            longitude: bLng,
            status: initialStatus,
            maps_url: branch.maps_url ?? null,
            opening_time: branch.opening_time ?? data.opening_time ?? null,
            closing_time: branch.closing_time ?? data.closing_time ?? null,
            has_branches: false,
            parent_restaurant_id: restaurent.id,
            booking_enabled: branch.booking_enabled ?? true,
            phone_number: branch.phone_number ?? data.phone_number ?? null,
            whatsapp_number: branch.whatsapp_number ?? data.whatsapp_number ?? null,
            email: branch.email ?? data.email ?? null,
            restaurentOwnerId: ownerId,
          },
        });
      }
    }

    const created = await prisma.restaurent.findUnique({
      where: { id: restaurent.id },
      include: restaurantFullInclude,
    });

    return res.status(201).json({
      message: "Restaurant created successfully",
      restaurent: created,
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
        parent_restaurant_id: null, // Only main restaurant listings are returned
        district: {
          isServiceAvailable: true,
          state: { isServiceAvailable: true },
        },
      },
      include: {
        ...districtHierarchyInclude,
        dishes: {
          where: { isAvailable: true },
          orderBy: { displayOrder: "asc" },
        },
        branches: {
          where: { status: "APPROVED" },
          include: districtHierarchyInclude,
          orderBy: { createdAt: "asc" },
        },
      },
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
      include: restaurantFullInclude,
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
      include: { branches: true },
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

    if (data.districtId) {
      const dCheck = await validateDistrictAndState(data.districtId, data.stateId);
      if (!dCheck.valid) {
        return res.status(400).json({ message: dCheck.error });
      }
    }

    let latitude = data.latitude ?? existingRestaurent.latitude;
    let longitude = data.longitude ?? existingRestaurent.longitude;

    if (data.maps_url && data.maps_url.trim() && data.maps_url !== existingRestaurent.maps_url) {
      try {
        const coords = await resolveGoogleMapsShortLink(data.maps_url.trim());
        latitude = coords.latitude;
        longitude = coords.longitude;
      } catch {
        return res.status(422).json({
          message: "Could not determine coordinates from the provided Google Maps link. Please verify the sharing link.",
        });
      }
    }

    const newRestaurantName = data.name ?? existingRestaurent.name;

    // Validate branches if provided
    if (data.has_branches && data.branches && data.branches.length > 0) {
      for (const branch of data.branches) {
        if (branch.name.trim() !== newRestaurantName.trim()) {
          return res.status(400).json({
            message: `Branch name "${branch.name}" does not match the parent restaurant name "${newRestaurantName}". Every branch must use the exact parent restaurant name.`,
          });
        }
        const bCheck = await validateDistrictAndState(branch.districtId, branch.stateId);
        if (!bCheck.valid) {
          return res.status(400).json({
            message: `Branch location error: ${bCheck.error}`,
          });
        }
      }
    }

    // If restaurant name changed, synchronize all child branch names
    if (data.name && data.name !== existingRestaurent.name) {
      await prisma.restaurent.updateMany({
        where: { parent_restaurant_id: restaurentId },
        data: { name: data.name },
      });
    }

    const menuStrings = data.dishes?.length
      ? data.dishes.map((d) => d.name)
      : data.menu !== undefined
      ? data.menu
      : existingRestaurent.menu;

    await prisma.restaurent.update({
      where: { id: restaurentId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.profile_logo !== undefined ? { profile_logo: data.profile_logo } : {}),
        ...(data.districtId !== undefined ? { districtId: data.districtId } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.rating !== undefined ? { rating: data.rating } : {}),
        ...(data.review !== undefined ? { review: data.review } : {}),
        menu: menuStrings,
        ...(data.food_category !== undefined ? { food_category: data.food_category } : {}),
        ...(data.images !== undefined ? { images: data.images } : {}),
        latitude,
        longitude,
        ...(data.maps_url !== undefined ? { maps_url: data.maps_url } : {}),
        ...(data.opening_time !== undefined ? { opening_time: data.opening_time } : {}),
        ...(data.closing_time !== undefined ? { closing_time: data.closing_time } : {}),
        ...(data.has_branches !== undefined ? { has_branches: data.has_branches } : {}),
        ...(data.phone_number !== undefined ? { phone_number: data.phone_number } : {}),
        ...(data.whatsapp_number !== undefined ? { whatsapp_number: data.whatsapp_number } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.website !== undefined ? { website: data.website } : {}),
        ...(data.booking_enabled !== undefined ? { booking_enabled: data.booking_enabled } : {}),
      },
    });

    // Update dishes
    if (data.dishes) {
      await prisma.restaurant_dish.deleteMany({
        where: { restaurantId: restaurentId },
      });
      if (data.dishes.length > 0) {
        await prisma.restaurant_dish.createMany({
          data: data.dishes.map((dish, idx) => ({
            restaurantId: restaurentId,
            name: dish.name,
            description: dish.description ?? null,
            foodCategory: dish.foodCategory ?? Food_Category.VEG_AND_NONVEG,
            price: dish.price ?? null,
            image: dish.image ?? null,
            isAvailable: dish.isAvailable ?? true,
            displayOrder: dish.displayOrder ?? idx,
          })),
        });
      }
    }

    // Update branches
    if (data.has_branches !== undefined || data.branches !== undefined) {
      if (data.has_branches && data.branches) {
        const inputBranchIds = new Set(data.branches.map((b) => b.id).filter(Boolean));

        // Safely archive or remove old branches not in the submitted list
        const existingBranches = existingRestaurent.branches || [];
        for (const eb of existingBranches) {
          if (!inputBranchIds.has(eb.id)) {
            const hasRes = await prisma.restaurant_reservation.count({
              where: { restaurantId: eb.id },
            });
            if (hasRes > 0) {
              // Soft deactivate branch if historical reservations exist
              await prisma.restaurent.update({
                where: { id: eb.id },
                data: { booking_enabled: false },
              });
            } else {
              await prisma.restaurent.delete({
                where: { id: eb.id },
              });
            }
          }
        }

        // Upsert submitted branches
        for (const branch of data.branches) {
          let bLat = branch.latitude ?? 0;
          let bLng = branch.longitude ?? 0;
          if (branch.maps_url && branch.maps_url.trim()) {
            try {
              const bCoords = await resolveGoogleMapsShortLink(branch.maps_url.trim());
              bLat = bCoords.latitude;
              bLng = bCoords.longitude;
            } catch {
              // keep
            }
          }

          if (branch.id) {
            await prisma.restaurent.update({
              where: { id: branch.id },
              data: {
                name: newRestaurantName,
                address: branch.address,
                districtId: branch.districtId,
                profile_logo: branch.profile_logo || data.profile_logo || existingRestaurent.profile_logo,
                images: branch.images?.length ? branch.images : data.images || existingRestaurent.images,
                latitude: bLat,
                longitude: bLng,
                maps_url: branch.maps_url ?? null,
                opening_time: branch.opening_time ?? null,
                closing_time: branch.closing_time ?? null,
                booking_enabled: branch.booking_enabled ?? true,
                phone_number: branch.phone_number ?? null,
                whatsapp_number: branch.whatsapp_number ?? null,
                email: branch.email ?? null,
              },
            });
          } else {
            await prisma.restaurent.create({
              data: {
                name: newRestaurantName,
                address: branch.address,
                districtId: branch.districtId,
                profile_logo: branch.profile_logo || data.profile_logo || existingRestaurent.profile_logo,
                images: branch.images?.length ? branch.images : data.images || existingRestaurent.images,
                latitude: bLat,
                longitude: bLng,
                maps_url: branch.maps_url ?? null,
                opening_time: branch.opening_time ?? null,
                closing_time: branch.closing_time ?? null,
                booking_enabled: branch.booking_enabled ?? true,
                phone_number: branch.phone_number ?? null,
                whatsapp_number: branch.whatsapp_number ?? null,
                email: branch.email ?? null,
                status: existingRestaurent.status,
                parent_restaurant_id: restaurentId,
                restaurentOwnerId: ownerId,
                rating: 0,
                review: [],
                menu: menuStrings,
                food_category: data.food_category ?? existingRestaurent.food_category,
              },
            });
          }
        }
      }
    }

    const updated = await prisma.restaurent.findUnique({
      where: { id: restaurentId },
      include: restaurantFullInclude,
    });

    return res.status(200).json({
      message: "Restaurant updated successfully",
      restaurent: updated,
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

    // Check if restaurant or any of its branches have historical reservations
    const reservationsCount = await prisma.restaurant_reservation.count({
      where: {
        OR: [
          { restaurantId: restaurentId },
          { restaurent: { parent_restaurant_id: restaurentId } },
        ],
      },
    });

    if (reservationsCount > 0) {
      // Safely deactivate rather than destroying historical customer reservations
      await prisma.restaurent.update({
        where: { id: restaurentId },
        data: { booking_enabled: false },
      });

      return res.status(200).json({
        message: "Restaurant has historical reservations. It has been deactivated instead of deleted to protect booking records.",
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
      where: {
        restaurentOwnerId: ownerId,
        parent_restaurant_id: null, // Return parent listings with branches attached
      },
      include: restaurantFullInclude,
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
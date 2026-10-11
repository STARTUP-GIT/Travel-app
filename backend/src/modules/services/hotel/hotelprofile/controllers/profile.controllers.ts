import type { Request, Response } from "express";
import { ZodError } from "zod";
import prisma from "../../../../../db/prisma.js";
import { Prisma } from "../../../../../generated/client/client.js";
import {
  hotelCreateSchema,
  hotelUpdateSchema,
} from "../../../../../services/zod.js";
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
  room_types: {
    orderBy: { displayOrder: "asc" as const },
  },
} as const;

const activeRoomTypesInclude = {
  district: {
    include: {
      state: {
        include: {
          country: true,
        },
      },
    },
  },
  room_types: {
    where: { isActive: true },
    orderBy: { displayOrder: "asc" as const },
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
      include: { state: true },
    });

    if (!district) {
      return res.status(400).json({
        message: "District does not exist",
      });
    }

    if (!district.isServiceAvailable || !district.state?.isServiceAvailable) {
      return res.status(400).json({
        message: "Selected district is not currently enabled for services",
      });
    }

    if (data.stateId && district.stateId !== data.stateId) {
      return res.status(400).json({
        message: "Selected district does not belong to the selected state",
      });
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

    let calculatedCost = data.cost_per_night ?? 0;
    if (data.roomTypes?.length) {
      const prices = data.roomTypes.map((rt) => rt.pricePerNight).filter((p) => p >= 0);
      if (prices.length > 0) {
        calculatedCost = Math.round(Math.min(...prices));
      }
    }

    // Admin auto-approval policy decides whether a new listing goes live
    // straight away or waits in the admin approval queue.
    const initialStatus = await resolveInitialStatus("hotels");

    const hotel = await prisma.hotel.create({
      data: {
        name: data.name,
        address: data.address,
        profile_logo: data.profile_logo,
        districtId: data.districtId,
        description: data.description ?? null,
        rating: data.rating ?? 0,
        review: data.review ?? [],
        cost_per_night: calculatedCost,
        images: data.images ?? [],
        latitude,
        longitude,
        status: initialStatus,
        ...(data.phone_number !== undefined ? { phone_number: data.phone_number || null } : {}),
        ...(data.whatsapp_number !== undefined ? { whatsapp_number: data.whatsapp_number || null } : {}),
        ...(data.email !== undefined ? { email: data.email || null } : {}),
        ...(data.website !== undefined ? { website: data.website || null } : {}),
        ...(data.booking_enabled !== undefined ? { booking_enabled: data.booking_enabled } : {}),
        hotelOwnerId: ownerId,
        star_rating: data.star_rating ?? null,
        maps_url: data.maps_url ?? null,
        check_in_time_type: data.check_in_time_type ?? null,
        check_in_time: data.check_in_time ?? null,
        check_in_start_time: data.check_in_start_time ?? null,
        check_in_end_time: data.check_in_end_time ?? null,
        check_out_time_type: data.check_out_time_type ?? null,
        check_out_time: data.check_out_time ?? null,
        check_out_start_time: data.check_out_start_time ?? null,
        check_out_end_time: data.check_out_end_time ?? null,
        property_type: data.property_type ?? "HOTEL",
        stay_category: data.stay_category ?? null,
        accommodation_rules: data.accommodation_rules ?? null,
        cancellation_policy: data.cancellation_policy ?? null,
        activities: data.activities ?? [],
        facilities: data.facilities ?? [],
        ...(data.roomTypes?.length
          ? {
              room_types: {
                create: data.roomTypes.map((rt, idx) => ({
                  title: rt.title,
                  description: rt.description,
                  category: rt.category ?? null,
                  roomType: rt.roomType,
                  maxOccupancy: rt.maxOccupancy,
                  availableRooms: rt.availableRooms,
                  pricePerNight: rt.pricePerNight,
                  roomOverviewPhoto: rt.roomOverviewPhoto,
                  bathroomPhoto: rt.bathroomPhoto,
                  images: rt.images ?? [],
                  hasHotWater: rt.hasHotWater,
                  hotWaterCharge: rt.hotWaterCharge ?? null,
                  hasTv: rt.hasTv,
                  hasAttachedBathroom: rt.hasAttachedBathroom,
                  hasWifi: rt.hasWifi,
                  facilities: rt.facilities ?? [],
                  additionalServices: rt.additionalServices ? (rt.additionalServices as any) : Prisma.JsonNull,
                  conditions: rt.conditions ?? null,
                  isActive: rt.isActive ?? true,
                  displayOrder: rt.displayOrder ?? idx,
                  roomCategory: rt.roomCategory ?? "PRIVATE",
                  bedType: rt.bedType ?? null,
                  dormGender: rt.dormGender ?? null,
                  bedCapacity: rt.bedCapacity ?? null,
                  pricingUnit: rt.pricingUnit ?? "PER_ROOM",
                })),
              },
            }
          : {}),
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
      where: {
        status: "APPROVED",
        district: {
          isServiceAvailable: true,
          state: { isServiceAvailable: true },
        },
      },
      include: activeRoomTypesInclude,
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
      include: activeRoomTypesInclude,
    });

    if (hotel && hotel.status !== "APPROVED") {
      return res.status(404).json({ message: "Hotel not found" });
    }

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
      select: { hotelOwnerId: true, property_type: true },
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

    if (data.districtId) {
      const district = await prisma.district.findUnique({
        where: { id: data.districtId },
        include: { state: true },
      });

      if (!district) {
        return res.status(400).json({ message: "District does not exist" });
      }

      if (!district.isServiceAvailable || !district.state?.isServiceAvailable) {
        return res.status(400).json({
          message: "Selected district is not currently enabled for services",
        });
      }

      if (data.stateId && district.stateId !== data.stateId) {
        return res.status(400).json({
          message: "Selected district does not belong to the selected state",
        });
      }
    }

    let latitude = data.latitude;
    let longitude = data.longitude;

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

    // Sync room types if provided
    if (data.roomTypes !== undefined) {
      const existingRoomTypes = await prisma.hotel_room_type.findMany({
        where: { hotelId },
      });

      const incomingIds = new Set(data.roomTypes.map((rt) => rt.id).filter(Boolean));

      // Deactivate or delete room types that were removed
      for (const existing of existingRoomTypes) {
        if (!incomingIds.has(existing.id)) {
          const bookingCount = await prisma.hotel_booking.count({
            where: { roomTypeId: existing.id },
          });

          if (bookingCount > 0) {
            // Keep historical bookings valid by setting isActive: false
            await prisma.hotel_room_type.update({
              where: { id: existing.id },
              data: { isActive: false },
            });
          } else {
            await prisma.hotel_room_type.delete({
              where: { id: existing.id },
            });
          }
        }
      }

      // Upsert incoming room types
      for (let idx = 0; idx < data.roomTypes.length; idx++) {
        const rt = data.roomTypes[idx];
        if (!rt) continue;
        if (rt.id && existingRoomTypes.some((e) => e.id === rt.id)) {
          await prisma.hotel_room_type.update({
            where: { id: rt.id },
            data: {
              title: rt.title,
              description: rt.description,
              category: rt.category ?? null,
              roomType: rt.roomType,
              maxOccupancy: rt.maxOccupancy,
              availableRooms: rt.availableRooms,
              pricePerNight: rt.pricePerNight,
              roomOverviewPhoto: rt.roomOverviewPhoto,
              bathroomPhoto: rt.bathroomPhoto,
              images: rt.images ?? [],
              hasHotWater: rt.hasHotWater,
              hotWaterCharge: rt.hotWaterCharge ?? null,
              hasTv: rt.hasTv,
              hasAttachedBathroom: rt.hasAttachedBathroom,
              hasWifi: rt.hasWifi,
              facilities: rt.facilities ?? [],
              additionalServices: rt.additionalServices ? (rt.additionalServices as any) : Prisma.JsonNull,
              conditions: rt.conditions ?? null,
              isActive: rt.isActive ?? true,
              displayOrder: rt.displayOrder ?? idx,
              roomCategory: rt.roomCategory ?? "PRIVATE",
              bedType: rt.bedType ?? null,
              dormGender: rt.dormGender ?? null,
              bedCapacity: rt.bedCapacity ?? null,
              pricingUnit: rt.pricingUnit ?? "PER_ROOM",
            },
          });
        } else {
          await prisma.hotel_room_type.create({
            data: {
              hotelId,
              title: rt.title,
              description: rt.description,
              category: rt.category ?? null,
              roomType: rt.roomType,
              maxOccupancy: rt.maxOccupancy,
              availableRooms: rt.availableRooms,
              pricePerNight: rt.pricePerNight,
              roomOverviewPhoto: rt.roomOverviewPhoto,
              bathroomPhoto: rt.bathroomPhoto,
              images: rt.images ?? [],
              hasHotWater: rt.hasHotWater,
              hotWaterCharge: rt.hotWaterCharge ?? null,
              hasTv: rt.hasTv,
              hasAttachedBathroom: rt.hasAttachedBathroom,
              hasWifi: rt.hasWifi,
              facilities: rt.facilities ?? [],
              additionalServices: rt.additionalServices ? (rt.additionalServices as any) : Prisma.JsonNull,
              conditions: rt.conditions ?? null,
              isActive: rt.isActive ?? true,
              displayOrder: rt.displayOrder ?? idx,
              roomCategory: rt.roomCategory ?? "PRIVATE",
              bedType: rt.bedType ?? null,
              dormGender: rt.dormGender ?? null,
              bedCapacity: rt.bedCapacity ?? null,
              pricingUnit: rt.pricingUnit ?? "PER_ROOM",
            },
          });
        }
      }
    }

    let calculatedCost = data.cost_per_night;
    if (data.roomTypes?.length) {
      const activePrices = data.roomTypes
        .filter((rt) => rt.isActive !== false)
        .map((rt) => rt.pricePerNight)
        .filter((p) => p >= 0);
      if (activePrices.length > 0) {
        calculatedCost = Math.round(Math.min(...activePrices));
      }
    }

    const hotel = await prisma.hotel.update({
      where: { id: hotelId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.profile_logo !== undefined ? { profile_logo: data.profile_logo } : {}),
        ...(data.districtId !== undefined ? { districtId: data.districtId } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.rating !== undefined ? { rating: data.rating } : {}),
        ...(data.review !== undefined ? { review: data.review } : {}),
        ...(calculatedCost !== undefined ? { cost_per_night: calculatedCost } : {}),
        ...(data.images !== undefined ? { images: data.images } : {}),
        ...(latitude !== undefined ? { latitude } : {}),
        ...(longitude !== undefined ? { longitude } : {}),
        ...(data.phone_number !== undefined ? { phone_number: data.phone_number || null } : {}),
        ...(data.whatsapp_number !== undefined ? { whatsapp_number: data.whatsapp_number || null } : {}),
        ...(data.email !== undefined ? { email: data.email || null } : {}),
        ...(data.website !== undefined ? { website: data.website || null } : {}),
        ...(data.booking_enabled !== undefined ? { booking_enabled: data.booking_enabled } : {}),
        ...(data.star_rating !== undefined ? { star_rating: data.star_rating } : {}),
        ...(data.maps_url !== undefined ? { maps_url: data.maps_url || null } : {}),
        ...(data.check_in_time_type !== undefined ? { check_in_time_type: data.check_in_time_type } : {}),
        ...(data.check_in_time !== undefined ? { check_in_time: data.check_in_time } : {}),
        ...(data.check_in_start_time !== undefined ? { check_in_start_time: data.check_in_start_time } : {}),
        ...(data.check_in_end_time !== undefined ? { check_in_end_time: data.check_in_end_time } : {}),
        ...(data.check_out_time_type !== undefined ? { check_out_time_type: data.check_out_time_type } : {}),
        ...(data.check_out_time !== undefined ? { check_out_time: data.check_out_time } : {}),
        ...(data.check_out_start_time !== undefined ? { check_out_start_time: data.check_out_start_time } : {}),
        ...(data.check_out_end_time !== undefined ? { check_out_end_time: data.check_out_end_time } : {}),
        ...(existingHotel.property_type ? { property_type: existingHotel.property_type } : (data.property_type !== undefined ? { property_type: data.property_type } : {})),
        ...(data.stay_category !== undefined ? { stay_category: data.stay_category } : {}),
        ...(data.accommodation_rules !== undefined ? { accommodation_rules: data.accommodation_rules } : {}),
        ...(data.cancellation_policy !== undefined ? { cancellation_policy: data.cancellation_policy } : {}),
        ...(data.activities !== undefined ? { activities: data.activities } : {}),
        ...(data.facilities !== undefined ? { facilities: data.facilities } : {}),
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

    const { property_type } = req.query;
    const whereClause: Prisma.hotelWhereInput = { hotelOwnerId: ownerId };

    if (property_type === "STAY") {
      whereClause.property_type = "STAY";
    } else if (property_type === "HOTEL") {
      whereClause.property_type = "HOTEL";
    }

    const hotels = await prisma.hotel.findMany({
      where: whereClause,
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
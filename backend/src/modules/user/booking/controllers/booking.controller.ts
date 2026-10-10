import type { Request, Response } from "express";
import { ZodError } from "zod";
import prisma from "../../../../db/prisma.js";
import { ownerPrisma } from "../../../../services/ownerPrisma.js";
import {
  findDistrictWithHierarchy,
  isDistrictAvailable,
} from "../../../../services/locationAvailability.js";
import {
  hotelBookingSchema,
  restaurantReservationSchema,
  specificGuideBookingSchema,
  commonGuideBookingSchema,
} from "../../../../services/zod.js";

export const createHotelBooking = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const data = hotelBookingSchema.parse(req.body);

    const hotel = await ownerPrisma.hotel.findUnique({
      where: { id: data.hotelId },
    });

    if (!hotel) {
      return res.status(404).json({ message: "Hotel not found" });
    }

    if (!hotel.booking_enabled) {
      return res.status(400).json({
        message: "Booking is not available for this hotel",
      });
    }

    const district = await findDistrictWithHierarchy(hotel.districtId);

    if (!district || !isDistrictAvailable(district)) {
      return res.status(400).json({
        message: "Booking is not available for this location",
      });
    }

    if (data.checkOut <= data.checkIn) {
      return res.status(400).json({
        message: "Check-out date must be after check-in date",
      });
    }

    const nights = Math.max(
      1,
      Math.round(
        (new Date(data.checkOut).getTime() -
          new Date(data.checkIn).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );

    const totalAmount = hotel.cost_per_night * nights * data.rooms;

    const booking = await ownerPrisma.hotel_booking.create({
      data: {
        hotelId: data.hotelId,
        userId,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        guests: data.guests,
        rooms: data.rooms,
        totalAmount,
      },
      include: { hotel: true, user: true },
    });

    return res.status(201).json({
      message: "Hotel booking created successfully",
      booking,
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

    console.error("Create hotel booking error:", error);

    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getUserHotelBookings = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    const bookings = await ownerPrisma.hotel_booking.findMany({
      where: { userId },
      include: { hotel: true },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(bookings);
  } catch (error) {
    console.error("Get user hotel bookings error:", error);

    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const createRestaurantReservation = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const data = restaurantReservationSchema.parse(req.body);

    const restaurent = await ownerPrisma.restaurent.findUnique({
      where: { id: data.restaurantId },
    });

    if (!restaurent) {
      return res.status(404).json({ message: "Restaurent not found" });
    }

    if (!restaurent.booking_enabled) {
      return res.status(400).json({
        message: "Reservation is not available for this restaurent",
      });
    }

    const district = await findDistrictWithHierarchy(restaurent.districtId);

    if (!district || !isDistrictAvailable(district)) {
      return res.status(400).json({
        message: "Reservation is not available for this location",
      });
    }

    const reservation = await ownerPrisma.restaurant_reservation.create({
      data: {
        restaurantId: data.restaurantId,
        userId,
        reservationDate: data.reservationDate,
        guests: data.guests,
      },
      include: { restaurent: true, user: true },
    });

    return res.status(201).json({
      message: "Restaurant reservation created successfully",
      reservation,
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

    console.error("Create restaurant reservation error:", error);

    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getUserRestaurantReservations = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    const reservations = await ownerPrisma.restaurant_reservation.findMany({
      where: { userId },
      include: { restaurent: true },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(reservations);
  } catch (error) {
    console.error("Get user restaurant reservations error:", error);

    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const createSpecificGuideBooking = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const data = specificGuideBookingSchema.parse(req.body);

    const guide = await prisma.specific_guide.findUnique({
      where: { id: data.specificGuideId },
      include: { place: true },
    });

    if (!guide) {
      return res.status(404).json({ message: "Specific guide not found" });
    }

    // A guide that is still PENDING or was REJECTED by an admin must not be
    // bookable, even if a client still holds a direct link to its id.
    if (guide.status !== "APPROVED") {
      return res.status(400).json({ message: "This guide is not available for booking yet" });
    }

    // A place guide may register without choosing a place, so there is nothing
    // to derive the booking district from until one is added.
    const { placeid, place } = guide;

    if (!place || !placeid) {
      return res.status(400).json({
        message: "This guide has not selected a place yet and cannot be booked",
      });
    }

    const district = await findDistrictWithHierarchy(place.districtId);

    if (!district || !isDistrictAvailable(district)) {
      return res.status(400).json({
        message: "Booking is not available for this location",
      });
    }

    const numberOfPeople = Math.max(1, data.numberOfPeople ?? 1);
    const totalPrice = guide.cost * numberOfPeople;

    const booking = await prisma.specific_guide_booking.create({
      data: {
        userId,
        specificGuideId: guide.id,
        placeId: placeid,
        bookingDate: data.bookingDate,
        ...(data.bookingTime !== undefined ? { bookingTime: data.bookingTime } : {}),
        numberOfPeople,
        totalPrice,
        pickupName: data.pickupName ?? null,
        pickupAddress: data.pickupAddress ?? null,
        pickupMapsUrl: data.pickupMapsUrl ?? null,
        requestedPickupName: data.requestedPickupName ?? null,
        requestedPickupAddress: data.requestedPickupAddress ?? null,
        requestedPickupMapsUrl: data.requestedPickupMapsUrl ?? null,
      },
      include: { specificGuide: true, place: true, user: true },
    });

    return res.status(201).json({
      message: "Specific guide booking created successfully",
      booking,
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

    console.error("Create specific guide booking error:", error);

    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getUserSpecificGuideBookings = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const bookings = await prisma.specific_guide_booking.findMany({
      where: { userId },
      include: { specificGuide: true, place: true },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(bookings);
  } catch (error) {
    console.error("Get user specific guide bookings error:", error);

    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const createCommonGuideBooking = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const data = commonGuideBookingSchema.parse(req.body);

    const guide = await prisma.common_guide.findUnique({
      where: { id: data.commonGuideId },
      include: { places: { include: { place: true } } },
    });

    if (!guide) {
      return res.status(404).json({ message: "Tour guide not found" });
    }

    if (guide.status !== "APPROVED") {
      return res.status(400).json({ message: "This guide is not available for booking yet" });
    }

    const uniquePlaceIds = [...new Set(data.placeIds)];

    if (uniquePlaceIds.length !== data.placeIds.length) {
      return res.status(400).json({
        message: "Duplicate place IDs are not allowed",
      });
    }

    let pkg: any = null;
    if (data.packageId) {
      pkg = await prisma.common_guide_package.findUnique({
        where: { id: data.packageId },
        include: { places: true },
      });
    }

    const guidePlaceIds = guide.places.map((guidePlace) => guidePlace.placeId);
    const packagePlaceIds = pkg?.places ? pkg.places.map((p: any) => p.placeId) : [];
    const associatedPlaceIds = [...new Set([...guidePlaceIds, ...packagePlaceIds])];

    const invalidPlaceIds = uniquePlaceIds.filter(
      (placeId) => !associatedPlaceIds.includes(placeId)
    );

    if (invalidPlaceIds.length > 0) {
      return res.status(400).json({
        message: "One or more selected places are not associated with this tour guide",
        invalidPlaceIds,
      });
    }

    const selectedPlacesFromDb = await prisma.place.findMany({
      where: { id: { in: uniquePlaceIds } },
      select: { id: true, districtId: true },
    });

    const districtIds = [...new Set(selectedPlacesFromDb.map((p) => p.districtId))];

    for (const districtId of districtIds) {
      const district = await findDistrictWithHierarchy(districtId);

      if (!district || !isDistrictAvailable(district)) {
        return res.status(400).json({
          message: "Booking is not available for this location",
        });
      }
    }

    const numberOfPeople = Math.max(1, data.numberOfPeople ?? 1);

    if (pkg && pkg.allowCustomerPlaceSelection === false) {
      const pkgPlaceIds = pkg.places.map((p: any) => p.placeId);
      const hasAllPlaces = pkgPlaceIds.every((pid: string) => uniquePlaceIds.includes(pid));
      if (!hasAllPlaces) {
        return res.status(400).json({
          message: "This tour package requires booking the complete tour. You cannot deselect places.",
        });
      }
    }

    // Availability Conflict Check
    const existingConflict = await prisma.common_guide_booking.findFirst({
      where: {
        commonGuideId: guide.id,
        bookingDate: data.bookingDate,
        bookingTime: data.bookingTime ?? null,
        status: "CONFIRMED",
      },
    });

    if (existingConflict) {
      return res.status(409).json({
        message: "This guide is already booked for the selected date and time.",
      });
    }

    let pricingMode = pkg?.pricingMode || "WHOLE_TOUR";
    let pricingUnit = pkg?.pricingUnit || "PER_TOUR";
    let calculatedTotalPrice = 0;

    if (pricingMode === "WHOLE_TOUR") {
      const basePrice = pkg?.price && pkg.price > 0 ? pkg.price : guide.cost;
      calculatedTotalPrice = pricingUnit === "PER_PERSON" ? basePrice * numberOfPeople : basePrice;
    } else {
      let placeSum = 0;
      if (pkg?.places?.length) {
        for (const pid of uniquePlaceIds) {
          const pkgPlace = pkg.places.find((p: any) => p.placeId === pid);
          if (pkgPlace?.price && pkgPlace.price > 0) {
            placeSum += pkgPlace.price;
          } else {
            placeSum += (guide.cost / Math.max(1, pkg.places.length));
          }
        }
      } else {
        placeSum = guide.cost * uniquePlaceIds.length;
      }
      calculatedTotalPrice = pricingUnit === "PER_PERSON" ? placeSum * numberOfPeople : placeSum;
    }

    const booking = await prisma.common_guide_booking.create({
      data: {
        userId,
        commonGuideId: guide.id,
        packageId: pkg?.id ?? null,
        bookingDate: data.bookingDate,
        bookingTime: data.bookingTime ?? null,
        numberOfPeople,
        totalPrice: Math.round(calculatedTotalPrice),
        pricingMode,
        pricingUnit,
        allowCustomerPlaceSelection: pkg?.allowCustomerPlaceSelection ?? true,
        cancellationPolicy: pkg?.cancellationPolicy ?? "Free cancellation up to 24h before trip start",
        foodStatus: pkg?.foodStatus ?? "EXCLUDED",
        foodDetails: pkg?.foodDetails ?? null,
        transportStatus: pkg?.transportStatus ?? "EXCLUDED",
        transportDetails: pkg?.transportDetails ?? null,
        entryFeeStatus: pkg?.entryFeeStatus ?? "EXCLUDED",
        entryFeeDetails: pkg?.entryFeeDetails ?? null,
        additionalCostsDetails: pkg?.additionalCostsDetails ?? null,
        tripStartTime: data.tripStartTime || pkg?.tripStartTime || data.bookingTime || null,
        pickupName: data.pickupName || pkg?.pickupName || null,
        pickupAddress: data.pickupAddress || pkg?.pickupAddress || null,
        pickupLat: data.pickupLat ?? pkg?.pickupLat ?? null,
        pickupLng: data.pickupLng ?? pkg?.pickupLng ?? null,
        pickupMapsUrl: data.pickupMapsUrl || pkg?.pickupMapsUrl || null,
        pickupRequestStatus: data.pickupRequestStatus ?? "DEFAULT",
        requestedPickupName: data.requestedPickupName ?? null,
        requestedPickupAddress: data.requestedPickupAddress ?? null,
        requestedPickupMapsUrl: data.requestedPickupMapsUrl ?? null,
        requestedPickupLat: data.requestedPickupLat ?? null,
        requestedPickupLng: data.requestedPickupLng ?? null,
        selectedPlaces: {
          create: uniquePlaceIds.map((placeId) => ({ placeId })),
        },
      },
      include: {
        commonGuide: true,
        user: true,
        selectedPlaces: { include: { place: true } },
      },
    });

    return res.status(201).json({
      message: "Tour guide booking created successfully",
      numberOfPlaces: booking.selectedPlaces.length,
      booking,
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

    console.error("Create common guide booking error:", error);

    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getUserCommonGuideBookings = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const bookings = await prisma.common_guide_booking.findMany({
      where: { userId },
      include: {
        commonGuide: true,
        package: true,
        selectedPlaces: { include: { place: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(bookings);
  } catch (error) {
    console.error("Get user common guide bookings error:", error);

    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getSpecificGuideLocation = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { bookingId } = req.params as { bookingId: string };

    const booking = await prisma.specific_guide_booking.findFirst({
      where: { id: bookingId, userId },
      include: { specificGuide: true },
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const guide = booking.specificGuide;
    if (!guide.isSharingLocation || !guide.sharedLatitude || !guide.sharedLongitude || !guide.locationUpdatedAt) {
      return res.status(200).json({ isSharing: false, message: "Guide is not currently sharing location" });
    }

    const ThirtyMinutesMs = 30 * 60 * 1000;
    const isExpired = Date.now() - new Date(guide.locationUpdatedAt).getTime() > ThirtyMinutesMs;

    return res.status(200).json({
      isSharing: !isExpired && guide.isSharingLocation,
      latitude: guide.sharedLatitude,
      longitude: guide.sharedLongitude,
      updatedAt: guide.locationUpdatedAt,
      isExpired,
      guideName: guide.full_name,
    });
  } catch (error) {
    console.error("Get specific guide location error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
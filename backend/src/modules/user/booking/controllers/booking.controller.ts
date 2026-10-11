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

const userSafeSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  phonenumber: true,
  profilepic: true,
} as const;

export const createHotelBooking = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const data = hotelBookingSchema.parse(req.body);

    const hotel = await prisma.hotel.findUnique({
      where: { id: data.hotelId },
      include: {
        district: { include: { state: true } },
      },
    });

    if (!hotel) {
      return res.status(404).json({ message: "Hotel not found" });
    }

    if (!hotel.booking_enabled) {
      return res.status(400).json({
        message: "Booking is not available for this hotel",
      });
    }

    if (!hotel.district?.isServiceAvailable || !hotel.district.state?.isServiceAvailable) {
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

    let booking;

    if (data.roomTypeId) {
      const roomType = await prisma.hotel_room_type.findFirst({
        where: { id: data.roomTypeId, hotelId: data.hotelId, isActive: true },
      });

      if (!roomType) {
        return res.status(404).json({ message: "Selected room type is not available" });
      }

      if (data.guests > roomType.maxOccupancy * data.rooms) {
        return res.status(400).json({
          message: `The selected rooms accommodate up to ${roomType.maxOccupancy * data.rooms} guests (${roomType.maxOccupancy} per room). Please adjust guest or room count.`,
        });
      }

      if (data.rooms > roomType.availableRooms) {
        return res.status(400).json({
          message: `Only ${roomType.availableRooms} room(s) currently available for this room type.`,
        });
      }

      const baseRoomTotal = roomType.pricePerNight * nights * data.rooms;
      let addOnsTotal = 0;
      const appliedAddOns: { name: string; type: string; price: number; priceBasis: string; total: number }[] = [];

      if (Array.isArray(data.selectedAddOns) && data.selectedAddOns.length > 0 && Array.isArray(roomType.additionalServices)) {
        const services = roomType.additionalServices as any[];
        for (const addOnName of data.selectedAddOns) {
          const match = services.find((s: any) => s.name === addOnName);
          if (match && match.type === "EXTRA_CHARGE" && typeof match.price === "number") {
            let charge = match.price;
            const basis = match.priceBasis || "PER_DAY";
            if (basis === "PER_DAY") charge *= nights;
            else if (basis === "PER_PERSON") charge *= data.guests;
            else if (basis === "PER_ROOM") charge *= data.rooms;
            addOnsTotal += charge;
            appliedAddOns.push({
              name: match.name,
              type: match.type,
              price: match.price,
              priceBasis: basis,
              total: charge,
            });
          }
        }
      }

      const calculatedTotalAmount = baseRoomTotal + addOnsTotal;

      const bookingSnapshot = {
        hotelId: hotel.id,
        hotelName: hotel.name,
        hotelAddress: hotel.address,
        hotelPhone: hotel.phone_number,
        hotelEmail: hotel.email,
        mapsUrl: hotel.maps_url,
        starRating: hotel.star_rating,
        checkInTimePolicy: {
          type: hotel.check_in_time_type,
          time: hotel.check_in_time,
          startTime: hotel.check_in_start_time,
          endTime: hotel.check_in_end_time,
        },
        checkOutTimePolicy: {
          type: hotel.check_out_time_type,
          time: hotel.check_out_time,
          startTime: hotel.check_out_start_time,
          endTime: hotel.check_out_end_time,
        },
        roomTypeId: roomType.id,
        roomTitle: roomType.title,
        roomDescription: roomType.description,
        roomType: roomType.roomType,
        maxOccupancy: roomType.maxOccupancy,
        pricePerNight: roomType.pricePerNight,
        roomsCount: data.rooms,
        nightsCount: nights,
        guestsCount: data.guests,
        baseRoomTotal,
        appliedAddOns,
        addOnsTotal,
        totalAmount: calculatedTotalAmount,
        facilities: roomType.facilities,
        hasHotWater: roomType.hasHotWater,
        hotWaterCharge: roomType.hotWaterCharge,
        hasTv: roomType.hasTv,
        hasAttachedBathroom: roomType.hasAttachedBathroom,
        hasWifi: roomType.hasWifi,
        roomOverviewPhoto: roomType.roomOverviewPhoto,
        bathroomPhoto: roomType.bathroomPhoto,
        notes: data.notes || null,
      };

      try {
        booking = await prisma.$transaction(async (tx) => {
          const freshRoom = await tx.hotel_room_type.findUnique({
            where: { id: roomType.id },
          });

          if (!freshRoom || freshRoom.availableRooms < data.rooms) {
            throw new Error("INSUFFICIENT_ROOM_INVENTORY");
          }

          await tx.hotel_room_type.update({
            where: { id: roomType.id },
            data: { availableRooms: { decrement: data.rooms } },
          });

          return await tx.hotel_booking.create({
            data: {
              hotelId: data.hotelId,
              userId,
              roomTypeId: roomType.id,
              checkIn: data.checkIn,
              checkOut: data.checkOut,
              guests: data.guests,
              rooms: data.rooms,
              totalAmount: calculatedTotalAmount,
              bookingSnapshot,
              notes: data.notes || null,
              status: "PENDING",
            },
            include: {
              hotel: true,
              roomType: true,
              user: { select: userSafeSelect },
            },
          });
        });
      } catch (err: any) {
        if (err?.message === "INSUFFICIENT_ROOM_INVENTORY") {
          return res.status(409).json({
            message: "The requested rooms are no longer available. Please select another room type.",
          });
        }
        throw err;
      }
    } else {
      const totalAmount = hotel.cost_per_night * nights * data.rooms;
      booking = await prisma.hotel_booking.create({
        data: {
          hotelId: data.hotelId,
          userId,
          checkIn: data.checkIn,
          checkOut: data.checkOut,
          guests: data.guests,
          rooms: data.rooms,
          totalAmount,
          notes: data.notes || null,
          bookingSnapshot: {
            hotelName: hotel.name,
            hotelAddress: hotel.address,
            pricePerNight: hotel.cost_per_night,
            roomsCount: data.rooms,
            nightsCount: nights,
            guestsCount: data.guests,
            totalAmount,
            notes: data.notes || null,
          },
        },
        include: {
          hotel: true,
          user: { select: userSafeSelect },
        },
      });
    }

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

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const bookings = await prisma.hotel_booking.findMany({
      where: { userId },
      include: {
        hotel: true,
        roomType: true,
        user: { select: userSafeSelect },
      },
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

    if (data.requestTicketAssistance) {
      if (!guide.canPurchaseEntryTickets) {
        return res.status(400).json({
          message: "Ticket purchasing assistance is not offered by this guide",
        });
      }
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
        requestTicketAssistance: Boolean(data.requestTicketAssistance),
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
      include: {
        specificGuide: true,
        place: true,
        user: { select: userSafeSelect },
      },
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
        include: {
          places: { include: { place: true } },
          specificGuide: true,
        },
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

    const numberOfAdults = Math.max(1, data.numberOfAdults ?? 1);
    const numberOfChildren = Math.max(0, data.numberOfChildren ?? 0);
    const numberOfPeople = numberOfAdults + numberOfChildren;

    if (pkg) {
      if (pkg.childrenAllowed === false && numberOfChildren > 0) {
        return res.status(400).json({
          message: "Children are not permitted for this tour package.",
        });
      }

      if (typeof pkg.maxGroupSize === "number" && pkg.maxGroupSize > 0) {
        const countingPassengers = pkg.childrenCountTowardCapacity
          ? numberOfPeople
          : numberOfAdults;
        if (countingPassengers > pkg.maxGroupSize) {
          return res.status(400).json({
            message: `Total travellers (${countingPassengers}) exceed the package maximum group size of ${pkg.maxGroupSize}.`,
          });
        }
      }

      if (
        (pkg.transportService === "INCLUDED" || pkg.transportService === "ON_REQUEST") &&
        Array.isArray(pkg.transportVehicles) &&
        pkg.transportVehicles.length > 0
      ) {
        const countingPassengers = pkg.childrenCountTowardCapacity
          ? numberOfPeople
          : numberOfAdults;

        const isAnyPrivate = pkg.transportVehicles.some((v: any) =>
          v.arrangement ? v.arrangement === "PRIVATE" : v.isPrivate !== false
        );

        if (isAnyPrivate) {
          // Private — this booking group only: customers from unrelated bookings will not share the vehicle
          const maxCapacity = Math.max(
            ...pkg.transportVehicles.map((v: any) => (typeof v.capacity === "number" ? v.capacity : 4))
          );
          if (countingPassengers > maxCapacity) {
            return res.status(400).json({
              message: `Group size (${countingPassengers}) exceeds the private vehicle capacity of ${maxCapacity} passengers.`,
            });
          }

          const existingPrivateBooking = await prisma.common_guide_booking.findFirst({
            where: {
              packageId: pkg.id,
              bookingDate: data.bookingDate,
              bookingTime: data.bookingTime ?? null,
              status: { in: ["CONFIRMED", "PENDING"] },
            },
          });
          if (existingPrivateBooking) {
            return res.status(409).json({
              message: "The private vehicle for this package is already reserved by another booking group for the selected date and time.",
            });
          }
        } else {
          // Shared — mixed booking groups: passenger capacity and available seats must be checked across all affected bookings
          const totalSharedCapacity = pkg.transportVehicles.reduce(
            (sum: number, v: any) => sum + (typeof v.capacity === "number" ? v.capacity : 4),
            0
          );
          const existingSharedBookings = await prisma.common_guide_booking.findMany({
            where: {
              packageId: pkg.id,
              bookingDate: data.bookingDate,
              bookingTime: data.bookingTime ?? null,
              status: { in: ["CONFIRMED", "PENDING"] },
            },
          });
          const bookedSeats = existingSharedBookings.reduce((sum, b) => {
            return sum + (pkg.childrenCountTowardCapacity ? b.numberOfPeople : b.numberOfAdults);
          }, 0);
          const availableSeats = totalSharedCapacity - bookedSeats;
          if (countingPassengers > availableSeats) {
            return res.status(400).json({
              message: `Vehicle capacity exceeded. Only ${Math.max(0, availableSeats)} seats remaining on this shared vehicle (requested: ${countingPassengers}).`,
            });
          }
        }
      }
    }

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
    const basePrice = pkg?.price && pkg.price > 0 ? pkg.price : guide.cost;

    let adultBaseRate = basePrice;
    if (pricingMode !== "WHOLE_TOUR") {
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
      adultBaseRate = placeSum;
    }

    // Authoritative child discount calculation:
    // 1. NO_DISCOUNT: child pays full adult price
    // 2. PERCENTAGE: discount of 1% to 99% off adult price
    // 3. FREE: 0 for eligible children
    // Backward compatibility: legacy pkg.childPrice is honored if childDiscountType is not set.
    const childDiscountType = pkg?.childDiscountType || (typeof pkg?.childPrice === "number" ? "LEGACY_PRICE" : "NO_DISCOUNT");
    let childRate = adultBaseRate;
    if (childDiscountType === "FREE") {
      childRate = 0;
    } else if (childDiscountType === "PERCENTAGE" && typeof pkg?.childDiscountPercent === "number") {
      const pct = Math.min(99, Math.max(1, pkg.childDiscountPercent));
      childRate = Math.round((adultBaseRate * (1 - pct / 100)) * 100) / 100;
    } else if (childDiscountType === "LEGACY_PRICE" && typeof pkg?.childPrice === "number") {
      childRate = pkg.childPrice;
    } else {
      // NO_DISCOUNT
      childRate = adultBaseRate;
    }

    if (pricingUnit === "PER_PERSON") {
      calculatedTotalPrice = (adultBaseRate * numberOfAdults) + (childRate * numberOfChildren);
    } else {
      // PER_TOUR: Group-based pricing, whole tour flat price
      calculatedTotalPrice = adultBaseRate;
    }

    const assignedSpecificGuideId =
      pkg?.hasSpecificGuide && pkg.specificGuideId ? pkg.specificGuideId : null;

    const bookingSnapshot = {
      packageId: pkg?.id ?? null,
      packageName: pkg?.name ?? "Custom Tour",
      packageDescription: pkg?.description ?? null,
      duration: pkg?.duration ?? null,
      maxGroupSize: pkg?.maxGroupSize ?? null,
      pricingMode,
      pricingUnit,
      basePrice: adultBaseRate,
      adultRate: pricingUnit === "PER_PERSON" ? adultBaseRate : null,
      childRate: pricingUnit === "PER_PERSON" ? childRate : null,
      adultsCount: numberOfAdults,
      childrenCount: numberOfChildren,
      totalTravellers: numberOfPeople,
      childPolicy: {
        childrenAllowed: pkg?.childrenAllowed ?? true,
        childMaxAge: pkg?.childMaxAge ?? 11,
        childrenCountTowardCapacity: pkg?.childrenCountTowardCapacity ?? true,
        childDiscountType: pkg?.childDiscountType ?? "NO_DISCOUNT",
        childDiscountPercent: pkg?.childDiscountPercent ?? null,
        childRate: pricingUnit === "PER_PERSON" ? childRate : null,
        adultRate: pricingUnit === "PER_PERSON" ? adultBaseRate : null,
        breakdown: pricingUnit === "PER_PERSON"
          ? `${numberOfAdults} adult(s) @ ${adultBaseRate} + ${numberOfChildren} child(ren) @ ${childRate}`
          : `Group flat rate: ${adultBaseRate}`,
      },
      cancellationPolicy: pkg?.cancellationPolicy ?? "Free cancellation up to 24h before trip start",
      tripStartTime: data.tripStartTime || pkg?.tripStartTime || data.bookingTime || null,
      pickupName: data.pickupName || pkg?.pickupName || null,
      pickupAddress: data.pickupAddress || pkg?.pickupAddress || null,
      pickupMapsUrl: data.pickupMapsUrl || pkg?.pickupMapsUrl || null,
      notes: data.notes || null,
      meals: {
        service: pkg?.mealsService ?? "NO_SERVICE",
        included: pkg?.includedMeals ?? [],
        details: pkg?.mealDetails ?? pkg?.foodDetails ?? null,
      },
      transport: {
        service: pkg?.transportService ?? "NO_SERVICE",
        vehicles: pkg?.transportVehicles ?? null,
      },
      specificGuide: pkg?.specificGuide
        ? {
            id: pkg.specificGuide.id,
            name: pkg.specificGuide.full_name,
            photo: pkg.specificGuide.profile_pic,
            tagline: pkg.specificGuide.tagline,
            languages: pkg.specificGuide.language,
          }
        : null,
      places: (pkg?.places ?? []).map((p: any) => ({
        id: p.place?.id ?? p.placeId,
        name: p.place?.name ?? "",
        visitArrangement: p.visitArrangement ?? "GUIDED",
        expectedDuration: p.expectedDuration ?? null,
        entryFeeStatus: p.entryFeeStatus ?? "EXCLUDED",
        entryFeeAmount: p.entryFeeAmount ?? null,
      })),
      calculatedTotalPrice: Math.round(calculatedTotalPrice),
    };

    const booking = await prisma.common_guide_booking.create({
      data: {
        userId,
        commonGuideId: guide.id,
        packageId: pkg?.id ?? null,
        bookingDate: data.bookingDate,
        bookingTime: data.bookingTime ?? null,
        numberOfPeople,
        numberOfAdults,
        numberOfChildren,
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
        specificGuideId: assignedSpecificGuideId,
        specificGuideStatus: assignedSpecificGuideId ? "PENDING" : null,
        bookingSnapshot,
        selectedPlaces: {
          create: uniquePlaceIds.map((placeId) => ({ placeId })),
        },
      },
      include: {
        commonGuide: true,
        specificGuide: true,
        package: true,
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
        specificGuide: true,
        package: true,
        user: { select: userSafeSelect },
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

export const getUserBookingById = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { bookingId } = req.params as { bookingId: string };
    if (!bookingId) {
      return res.status(400).json({ message: "Booking ID is required" });
    }

    // 1. Check Tour Guide (Common Guide) Booking
    const commonBooking = await prisma.common_guide_booking.findFirst({
      where: { id: bookingId, userId },
      include: {
        commonGuide: true,
        specificGuide: true,
        package: {
          include: {
            places: { include: { place: true } },
          },
        },
        user: { select: userSafeSelect },
        selectedPlaces: {
          include: {
            place: {
              include: {
                district: { include: { state: true } },
              },
            },
          },
        },
      },
    });

    if (commonBooking) {
      return res.status(200).json({
        type: "common",
        booking: commonBooking,
      });
    }

    // 2. Check Specific Guide Booking
    const specificBooking = await prisma.specific_guide_booking.findFirst({
      where: { id: bookingId, userId },
      include: {
        specificGuide: true,
        place: {
          include: {
            district: { include: { state: true } },
          },
        },
        user: { select: userSafeSelect },
      },
    });

    if (specificBooking) {
      return res.status(200).json({
        type: "specific",
        booking: specificBooking,
      });
    }

    // 3. Check Hotel Booking
    const hotelBooking = await ownerPrisma.hotel_booking.findFirst({
      where: { id: bookingId, userId },
      include: {
        hotel: true,
        user: { select: userSafeSelect },
      },
    });

    if (hotelBooking) {
      return res.status(200).json({
        type: "hotel",
        booking: hotelBooking,
      });
    }

    // 4. Check Restaurant Reservation
    const reservation = await ownerPrisma.restaurant_reservation.findFirst({
      where: { id: bookingId, userId },
      include: {
        restaurent: true,
        user: { select: userSafeSelect },
      },
    });

    if (reservation) {
      return res.status(200).json({
        type: "restaurant",
        booking: reservation,
      });
    }

    return res.status(404).json({ message: "Booking not found" });
  } catch (error) {
    console.error("Get user booking by ID error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
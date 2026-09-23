import type { Request, Response } from "express";
import prisma from "../../db/prisma.js";

/**
 * Admin-only management endpoints. Everything in this folder is isolated to
 * support the admin panel without touching unrelated backend modules.
 * All handlers assume adminAuthMiddleware has already run.
 */

const userSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  phonenumber: true,
  profilepic: true,
  authprovider: true,
  createdAt: true,
  updatedAt: true,
} as const;

const specificGuideSelect = {
  id: true,
  full_name: true,
  username: true,
  email: true,
  phonenumber: true,
  profile_pic: true,
  tagline: true,
  authprovider: true,
  rating: true,
  description: true,
  isReported: true,
  experience: true,
  cost: true,
  language: true,
  createdAt: true,
  updatedAt: true,
} as const;

const commonGuideSelect = {
  id: true,
  full_name: true,
  username: true,
  email: true,
  phonenumber: true,
  profile_pic: true,
  tagline: true,
  authprovider: true,
  rating: true,
  description: true,
  isReported: true,
  experience: true,
  cost: true,
  language: true,
  createdAt: true,
  updatedAt: true,
} as const;

const ownerSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  phone_number: true,
  profile_pic: true,
  createdAt: true,
  updatedAt: true,
} as const;

const placeSelect = {
  id: true,
  name: true,
  description: true,
  districtId: true,
  images: true,
  entryfee: true,
  category: true,
  latitude: true,
  longitude: true,
  createdAt: true,
  updatedAt: true,
} as const;

const hotelSelect = {
  id: true,
  name: true,
  address: true,
  profile_logo: true,
  districtId: true,
  description: true,
  rating: true,
  cost_per_night: true,
  images: true,
  phone_number: true,
  whatsapp_number: true,
  email: true,
  website: true,
  booking_enabled: true,
  createdAt: true,
  updatedAt: true,
} as const;

const restaurentSelect = {
  id: true,
  name: true,
  address: true,
  districtId: true,
  description: true,
  rating: true,
  menu: true,
  food_category: true,
  images: true,
  profile_logo: true,
  phone_number: true,
  whatsapp_number: true,
  email: true,
  website: true,
  booking_enabled: true,
  createdAt: true,
  updatedAt: true,
} as const;

const BOOKING_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "REJECTED",
  "CANCELLED",
  "COMPLETED",
] as const;

const handleError = (res: Response, error: unknown) => {
  console.error("Admin API error:", error);
  return res.status(500).json({ message: "Internal Server Error" });
};

export const getDashboardStats = async (_req: Request, res: Response) => {
  try {
    const [
      users,
      states,
      districts,
      places,
      pendingPlaceSubmissions,
      specificGuides,
      commonGuides,
      hotels,
      restaurants,
      hotelBookings,
      restaurantReservations,
      specificGuideBookings,
      commonGuideBookings,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.state.count(),
      prisma.district.count(),
      prisma.place.count(),
      prisma.place_submission.count({ where: { status: "PENDING" } }),
      prisma.specific_guide.count(),
      prisma.common_guide.count(),
      prisma.hotel.count(),
      prisma.restaurent.count(),
      prisma.hotel_booking.count(),
      prisma.restaurant_reservation.count(),
      prisma.specific_guide_booking.count(),
      prisma.common_guide_booking.count(),
    ]);

    return res.status(200).json({
      users,
      states,
      districts,
      places,
      pendingPlaceSubmissions,
      specificGuides,
      commonGuides,
      guides: specificGuides + commonGuides,
      hotels,
      restaurants,
      hotelBookings,
      restaurantReservations,
      guideBookings: specificGuideBookings + commonGuideBookings,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const getConfig = async () =>
  prisma.app_config.findFirst({ orderBy: { id: "asc" } });

export const getAppSettings = async (_req: Request, res: Response) => {
  try {
    const config = await getConfig();
    const settings = config ?? {
      id: "",
      app_name: "",
      app_description: "",
      webTitle: "",
      icon: "",
      imageBanners: [],
      text: "",
      contacts: "",
      termsandconditions: "",
      privacy: "",
    };
    return res.status(200).json({ settings });
  } catch (error) {
    return handleError(res, error);
  }
};

export const updateAppSettings = async (req: Request, res: Response) => {
  try {
    const {
      app_name,
      webTitle,
      icon,
      imageBanners,
      text,
      app_description,
      contacts,
      termsandconditions,
      privacy,
    } = req.body ?? {};

    const data: Record<string, unknown> = {};
    if (typeof app_name === "string") data.app_name = app_name;
    if (typeof webTitle === "string") data.webTitle = webTitle;
    if (typeof icon === "string") data.icon = icon;
    if (typeof text === "string") data.text = text;
    if (typeof app_description === "string") data.app_description = app_description;
    if (typeof contacts === "string") data.contacts = contacts;
    if (typeof termsandconditions === "string") data.termsandconditions = termsandconditions;
    if (typeof privacy === "string") data.privacy = privacy;
    if (Array.isArray(imageBanners) && imageBanners.every((i) => typeof i === "string")) {
      data.imageBanners = imageBanners;
    }

    let config = await getConfig();

    if (!config) {
      config = await prisma.app_config.create({
        data: {
          ...data,
          app_name: (data.app_name as string) ?? "Karnataka Tourism Guide",
          icon: (data.icon as string) ?? "",
          webTitle: (data.webTitle as string) ?? "",
          text: (data.text as string) ?? "",
          contacts: (data.contacts as string) ?? "",
          termsandconditions: (data.termsandconditions as string) ?? "",
          privacy: (data.privacy as string) ?? "",
          app_description: (data.app_description as string) ?? "",
          imageBanners: (data.imageBanners as string[]) ?? [],
        },
      });
    } else {
      config = await prisma.app_config.update({
        where: { id: config.id },
        data,
      });
    }

    return res.status(200).json({
      message: "Application settings updated successfully",
      settings: config,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const updateState = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { isServiceAvailable } = req.body ?? {};

    if (typeof isServiceAvailable !== "boolean") {
      return res.status(400).json({ message: "isServiceAvailable must be a boolean" });
    }

    const updated = await prisma.state.update({
      where: { id },
      data: { isServiceAvailable },
      include: { country: true, _count: { select: { districts: true } } },
    });
    return res.status(200).json({ message: "State updated", state: updated });
  } catch (error) {
    return handleError(res, error);
  }
};

export const updateDistrict = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { isServiceAvailable, autoApprovePlaces } = req.body ?? {};

    const data: Record<string, unknown> = {};
    if (isServiceAvailable !== undefined) {
      if (typeof isServiceAvailable !== "boolean") {
        return res.status(400).json({ message: "isServiceAvailable must be a boolean" });
      }
      data.isServiceAvailable = isServiceAvailable;
    }
    if (autoApprovePlaces !== undefined) {
      if (typeof autoApprovePlaces !== "boolean") {
        return res.status(400).json({ message: "autoApprovePlaces must be a boolean" });
      }
      data.autoApprovePlaces = autoApprovePlaces;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    const updated = await prisma.district.update({
      where: { id },
      data,
      include: { state: { include: { country: true } } },
    });
    return res.status(200).json({ message: "District updated", district: updated });
  } catch (error) {
    return handleError(res, error);
  }
};

export const listStates = async (req: Request, res: Response) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const states = await prisma.state.findMany({
      ...(search ? { where: { name: { contains: search, mode: "insensitive" } } } : {}),
      include: {
        country: true,
        _count: { select: { districts: true } },
      },
      orderBy: { name: "asc" },
    });
    return res.status(200).json({ states });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getStateById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const state = await prisma.state.findUnique({
      where: { id },
      include: {
        country: true,
        districts: { include: { _count: { select: { places: true } } }, orderBy: { name: "asc" } },
        _count: { select: { districts: true } },
      },
    });
    if (!state) return res.status(404).json({ message: "State not found" });
    return res.status(200).json({ state });
  } catch (error) {
    return handleError(res, error);
  }
};

export const listDistricts = async (req: Request, res: Response) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const stateId = typeof req.query.stateId === "string" ? req.query.stateId : undefined;
    const districts = await prisma.district.findMany({
      where: {
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
        ...(stateId ? { stateId } : {}),
      },
      include: {
        state: { include: { country: true } },
        _count: { select: { places: true, hotels: true, restaurent: true } },
      },
      orderBy: { name: "asc" },
    });
    return res.status(200).json({ districts });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getDistrictById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const district = await prisma.district.findUnique({
      where: { id },
      include: {
        state: { include: { country: true } },
        _count: { select: { places: true, hotels: true, restaurent: true } },
      },
    });
    if (!district) return res.status(404).json({ message: "District not found" });
    return res.status(200).json({ district });
  } catch (error) {
    return handleError(res, error);
  }
};

export const listPlaces = async (req: Request, res: Response) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const districtId = typeof req.query.districtId === "string" ? req.query.districtId : undefined;
    const stateId = typeof req.query.stateId === "string" ? req.query.stateId : undefined;
    const places = await prisma.place.findMany({
      where: {
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
        ...(districtId ? { districtId } : {}),
        ...(stateId ? { district: { stateId } } : {}),
      },
      include: {
        district: { include: { state: { include: { country: true } } } },
        _count: { select: { specificguide: true, commonGuidePlaces: true, user_fav_place: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ places });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getPlaceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const place = await prisma.place.findUnique({
      where: { id },
      include: {
        district: { include: { state: { include: { country: true } } } },
        specificguide: { select: { ...specificGuideSelect, review: true } },
        commonGuidePlaces: {
          include: { commonGuide: { select: { ...commonGuideSelect, review: true } } },
        },
        placeSubmissions: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!place) return res.status(404).json({ message: "Place not found" });
    return res.status(200).json({ place });
  } catch (error) {
    return handleError(res, error);
  }
};

export const listPlaceSubmissions = async (req: Request, res: Response) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : "PENDING";
    const submissions = await prisma.place_submission.findMany({
      where: { status: status as "PENDING" },
      include: {
        district: { include: { state: true } },
        place: { select: placeSelect },
        specificGuide: { select: specificGuideSelect },
        commonGuide: { select: commonGuideSelect },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ submissions });
  } catch (error) {
    return handleError(res, error);
  }
};

export const listUsers = async (req: Request, res: Response) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const users = await prisma.user.findMany({
      ...(search
        ? {
            where: {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { username: { contains: search, mode: "insensitive" } },
              ],
            },
          }
        : {}),
      select: {
        ...userSelect,
        _count: {
          select: {
            hotel_booking: true,
            restaurant_reservation: true,
            specificGuideBookings: true,
            commonGuideBookings: true,
            user_fav_place: true,
            testimonials: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ users });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        ...userSelect,
        user_fav_place: { include: { place: { select: { ...placeSelect, district: { select: { id: true, name: true } } } } } },
        hotel_booking: { include: { hotel: { select: hotelSelect } }, orderBy: { createdAt: "desc" } },
        restaurant_reservation: { include: { restaurent: { select: restaurentSelect } }, orderBy: { createdAt: "desc" } },
        specificGuideBookings: { include: { specificGuide: { select: specificGuideSelect }, place: { select: placeSelect } }, orderBy: { createdAt: "desc" } },
        commonGuideBookings: { include: { commonGuide: { select: commonGuideSelect } }, orderBy: { createdAt: "desc" } },
      },
    });
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.status(200).json({ user });
  } catch (error) {
    return handleError(res, error);
  }
};

export const listSpecificGuides = async (req: Request, res: Response) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const guides = await prisma.specific_guide.findMany({
      ...(search
        ? {
            where: {
              OR: [
                { full_name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            },
          }
        : {}),
      select: {
        ...specificGuideSelect,
        place: { select: { id: true, name: true, images: true, district: { select: { id: true, name: true } } } },
        _count: { select: { bookings: true, placeSubmissions: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ guides });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getSpecificGuideById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const guide = await prisma.specific_guide.findUnique({
      where: { id },
      select: { ...specificGuideSelect, review: true, place: { select: placeSelect } },
    });
    if (!guide) return res.status(404).json({ message: "Specific guide not found" });
    return res.status(200).json({ guide });
  } catch (error) {
    return handleError(res, error);
  }
};

export const listCommonGuides = async (req: Request, res: Response) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const guides = await prisma.common_guide.findMany({
      ...(search
        ? {
            where: {
              OR: [
                { full_name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            },
          }
        : {}),
      select: {
        ...commonGuideSelect,
        places: { include: { place: { select: { id: true, name: true, images: true, district: { select: { id: true, name: true } } } } } },
        _count: { select: { bookings: true, placeSubmissions: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ guides });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getCommonGuideById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const guide = await prisma.common_guide.findUnique({
      where: { id },
      select: {
        ...commonGuideSelect,
        review: true,
        places: { include: { place: { select: placeSelect } } },
      },
    });
    if (!guide) return res.status(404).json({ message: "Common guide not found" });
    return res.status(200).json({ guide });
  } catch (error) {
    return handleError(res, error);
  }
};

export const listHotels = async (req: Request, res: Response) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const districtId = typeof req.query.districtId === "string" ? req.query.districtId : undefined;
    const hotels = await prisma.hotel.findMany({
      where: {
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
        ...(districtId ? { districtId } : {}),
      },
      include: {
        district: { include: { state: true } },
        hotelOwner: { select: ownerSelect },
        _count: { select: { bookings: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ hotels });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getHotelById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const hotel = await prisma.hotel.findUnique({
      where: { id },
      include: {
        district: { include: { state: true } },
        hotelOwner: { select: ownerSelect },
      },
    });
    if (!hotel) return res.status(404).json({ message: "Hotel not found" });
    return res.status(200).json({ hotel });
  } catch (error) {
    return handleError(res, error);
  }
};

export const listRestaurants = async (req: Request, res: Response) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const districtId = typeof req.query.districtId === "string" ? req.query.districtId : undefined;
    const restaurants = await prisma.restaurent.findMany({
      where: {
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
        ...(districtId ? { districtId } : {}),
      },
      include: {
        district: { include: { state: true } },
        restaurentOwner: { select: ownerSelect },
        _count: { select: { reservations: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ restaurants });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getRestaurantById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const restaurant = await prisma.restaurent.findUnique({
      where: { id },
      include: {
        district: { include: { state: true } },
        restaurentOwner: { select: ownerSelect },
      },
    });
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
    return res.status(200).json({ restaurant });
  } catch (error) {
    return handleError(res, error);
  }
};

export const listHotelOwners = async (req: Request, res: Response) => {
  try {
    const owners = await prisma.hotel_owner.findMany({
      select: { ...ownerSelect, hotels: { select: { id: true, name: true, districtId: true } } },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ owners });
  } catch (error) {
    return handleError(res, error);
  }
};

export const listRestaurantOwners = async (req: Request, res: Response) => {
  try {
    const owners = await prisma.restaurent_owner.findMany({
      select: { ...ownerSelect, restaurents: { select: { id: true, name: true, districtId: true } } },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ owners });
  } catch (error) {
    return handleError(res, error);
  }
};

export const listGuideBookings = async (req: Request, res: Response) => {
  try {
    const [specificBookings, commonBookings] = await Promise.all([
      prisma.specific_guide_booking.findMany({
        include: {
          user: { select: userSelect },
          specificGuide: { select: specificGuideSelect },
          place: { select: placeSelect },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.common_guide_booking.findMany({
        include: {
          user: { select: userSelect },
          commonGuide: { select: commonGuideSelect },
          selectedPlaces: {
            include: { place: { select: placeSelect } },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return res.status(200).json({ specificBookings, commonBookings });
  } catch (error) {
    return handleError(res, error);
  }
};

export const updateGuideBookingStatus = async (req: Request, res: Response) => {
  try {
    const { kind, id } = req.params as { kind: string; id: string };
    const { status } = req.body ?? {};

    if (!BOOKING_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid booking status" });
    }

    if (kind === "specific") {
      const booking = await prisma.specific_guide_booking.update({
        where: { id },
        data: { status },
      });
      return res.status(200).json({ message: "Booking status updated", booking });
    }

    if (kind === "common") {
      const booking = await prisma.common_guide_booking.update({
        where: { id },
        data: { status },
      });
      return res.status(200).json({ message: "Booking status updated", booking });
    }

    return res.status(400).json({ message: "Invalid booking type" });
  } catch (error) {
    return handleError(res, error);
  }
};

export const listHotelBookings = async (req: Request, res: Response) => {
  try {
    const bookings = await prisma.hotel_booking.findMany({
      include: {
        user: { select: userSelect },
        hotel: { select: { ...hotelSelect, district: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ bookings });
  } catch (error) {
    return handleError(res, error);
  }
};

export const updateHotelBookingStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { status } = req.body ?? {};
    if (!BOOKING_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid booking status" });
    }
    const booking = await prisma.hotel_booking.update({
      where: { id },
      data: { status },
    });
    return res.status(200).json({ message: "Booking status updated", booking });
  } catch (error) {
    return handleError(res, error);
  }
};

export const listReservations = async (req: Request, res: Response) => {
  try {
    const reservations = await prisma.restaurant_reservation.findMany({
      include: {
        user: { select: userSelect },
        restaurent: { select: { ...restaurentSelect, district: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ reservations });
  } catch (error) {
    return handleError(res, error);
  }
};

export const updateReservationStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { status } = req.body ?? {};
    if (!BOOKING_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid booking status" });
    }
    const reservation = await prisma.restaurant_reservation.update({
      where: { id },
      data: { status },
    });
    return res.status(200).json({ message: "Reservation status updated", reservation });
  } catch (error) {
    return handleError(res, error);
  }
};

export const listTestimonials = async (req: Request, res: Response) => {
  try {
    const testimonials = await prisma.testimonials.findMany({
      include: {
        user: { select: userSelect },
        specificguide: { select: { id: true, full_name: true } },
        commonGuide: { select: { id: true, full_name: true } },
      },
      orderBy: { id: "asc" },
    });
    return res.status(200).json({ testimonials });
  } catch (error) {
    return handleError(res, error);
  }
};
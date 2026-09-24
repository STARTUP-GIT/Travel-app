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
  status: true,
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
  status: true,
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
  status: true,
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

const CONTENT_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
type ContentStatus = (typeof CONTENT_STATUSES)[number];

function getContentStatus(value: unknown): ContentStatus | undefined {
  return typeof value === "string" && CONTENT_STATUSES.includes(value as ContentStatus)
    ? (value as ContentStatus)
    : undefined;
}

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
    const { name, isServiceAvailable, primaryImage } = req.body ?? {};

    const data: Record<string, unknown> = {};
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "name must be a non-empty string" });
      }
      data.name = name.trim();
    }
    if (isServiceAvailable !== undefined) {
      if (typeof isServiceAvailable !== "boolean") {
        return res.status(400).json({ message: "isServiceAvailable must be a boolean" });
      }
      data.isServiceAvailable = isServiceAvailable;
    }
    if (primaryImage !== undefined) {
      if (primaryImage !== null && (typeof primaryImage !== "string" || !primaryImage.trim())) {
        return res.status(400).json({ message: "primaryImage must be a non-empty string or null" });
      }
      data.primaryImage =
        primaryImage === null ? null : primaryImage.trim().length > 0 ? primaryImage.trim() : null;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    const updated = await prisma.state.update({
      where: { id },
      data,
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
    const { name, isServiceAvailable, autoApprovePlaces } = req.body ?? {};

    const data: Record<string, unknown> = {};
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "name must be a non-empty string" });
      }
      data.name = name.trim();
    }
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
    const status = getContentStatus(req.query.status);
    const places = await prisma.place.findMany({
      where: {
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
        ...(districtId ? { districtId } : {}),
        ...(stateId ? { district: { stateId } } : {}),
        ...(status ? { status } : {}),
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
    const rawStatus = typeof req.query.status === "string" ? req.query.status : "PENDING";
    const status = ["PENDING", "APPROVED", "REJECTED"].includes(rawStatus)
      ? (rawStatus as "PENDING" | "APPROVED" | "REJECTED")
      : undefined;

    const submissions = await prisma.place_submission.findMany({
      where: status ? { status } : {},
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
    const status = getContentStatus(req.query.status);
    const hotels = await prisma.hotel.findMany({
      where: {
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
        ...(districtId ? { districtId } : {}),
        ...(status ? { status } : {}),
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

export const createHotelAdmin = async (req: Request, res: Response) => {
  try {
    const { name, address, districtId, hotelOwnerId, profile_logo, description, rating, cost_per_night, images, latitude, longitude, phone_number, whatsapp_number, email, website, booking_enabled } = req.body ?? {};
    if (typeof name !== "string" || !name.trim()) return res.status(400).json({ message: "name is required" });
    if (typeof address !== "string" || !address.trim()) return res.status(400).json({ message: "address is required" });
    if (typeof districtId !== "string" || !districtId.trim()) return res.status(400).json({ message: "districtId is required" });
    if (typeof hotelOwnerId !== "string" || !hotelOwnerId.trim()) return res.status(400).json({ message: "hotelOwnerId is required" });

    const [district, owner] = await Promise.all([
      prisma.district.findUnique({ where: { id: districtId }, select: { id: true } }),
      prisma.hotel_owner.findUnique({ where: { id: hotelOwnerId }, select: { id: true } }),
    ]);

    if (!district) return res.status(400).json({ message: "District not found" });
    if (!owner) return res.status(400).json({ message: "Hotel owner not found" });

    const hotel = await prisma.hotel.create({
      data: {
        name: name.trim(),
        address: address.trim(),
        profile_logo: typeof profile_logo === "string" ? profile_logo : "",
        districtId,
        description: typeof description === "string" ? description : null,
        rating: typeof rating === "number" ? rating : 0,
        cost_per_night: typeof cost_per_night === "number" ? cost_per_night : 0,
        images: Array.isArray(images) && images.every((item) => typeof item === "string") ? images : [],
        latitude: typeof latitude === "number" ? latitude : 0,
        longitude: typeof longitude === "number" ? longitude : 0,
        phone_number: typeof phone_number === "string" ? phone_number : null,
        whatsapp_number: typeof whatsapp_number === "string" ? whatsapp_number : null,
        email: typeof email === "string" ? email : null,
        website: typeof website === "string" ? website : null,
        booking_enabled: typeof booking_enabled === "boolean" ? booking_enabled : true,
        status: "APPROVED",
        hotelOwnerId,
      },
      include: { district: { include: { state: true } }, hotelOwner: { select: ownerSelect } },
    });

    return res.status(201).json({ message: "Hotel created", hotel });
  } catch (error) {
    return handleError(res, error);
  }
};

export const updateHotelAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { name, address, districtId, profile_logo, description, rating, cost_per_night, images, latitude, longitude, phone_number, whatsapp_number, email, website, booking_enabled } = req.body ?? {};
    const existing = await prisma.hotel.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Hotel not found" });

    const hotel = await prisma.hotel.update({
      where: { id },
      data: {
        ...(typeof name === "string" && name.trim() ? { name: name.trim() } : {}),
        ...(typeof address === "string" && address.trim() ? { address: address.trim() } : {}),
        ...(typeof districtId === "string" && districtId.trim() ? { districtId } : {}),
        ...(typeof profile_logo === "string" ? { profile_logo } : {}),
        ...(typeof description === "string" ? { description } : {}),
        ...(typeof rating === "number" ? { rating } : {}),
        ...(typeof cost_per_night === "number" ? { cost_per_night } : {}),
        ...(Array.isArray(images) && images.every((item) => typeof item === "string") ? { images } : {}),
        ...(typeof latitude === "number" ? { latitude } : {}),
        ...(typeof longitude === "number" ? { longitude } : {}),
        ...(typeof phone_number === "string" || phone_number === null ? { phone_number } : {}),
        ...(typeof whatsapp_number === "string" || whatsapp_number === null ? { whatsapp_number } : {}),
        ...(typeof email === "string" || email === null ? { email } : {}),
        ...(typeof website === "string" || website === null ? { website } : {}),
        ...(typeof booking_enabled === "boolean" ? { booking_enabled } : {}),
      },
      include: { district: { include: { state: true } }, hotelOwner: { select: ownerSelect } },
    });

    return res.status(200).json({ message: "Hotel updated", hotel });
  } catch (error) {
    return handleError(res, error);
  }
};

export const updateHotelStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { status } = req.body ?? {};
    if (status !== "PENDING" && status !== "APPROVED" && status !== "REJECTED") {
      return res.status(400).json({ message: "Invalid hotel status" });
    }
    const hotel = await prisma.hotel.update({ where: { id }, data: { status } });
    return res.status(200).json({ message: "Hotel status updated", hotel });
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
    const status = getContentStatus(req.query.status);
    const restaurants = await prisma.restaurent.findMany({
      where: {
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
        ...(districtId ? { districtId } : {}),
        ...(status ? { status } : {}),
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

export const createRestaurantAdmin = async (req: Request, res: Response) => {
  try {
    const { name, address, districtId, restaurentOwnerId, profile_logo, description, rating, food_category, images, latitude, longitude, phone_number, whatsapp_number, email, website, booking_enabled, menu } = req.body ?? {};
    if (typeof name !== "string" || !name.trim()) return res.status(400).json({ message: "name is required" });
    if (typeof address !== "string" || !address.trim()) return res.status(400).json({ message: "address is required" });
    if (typeof districtId !== "string" || !districtId.trim()) return res.status(400).json({ message: "districtId is required" });
    if (typeof restaurentOwnerId !== "string" || !restaurentOwnerId.trim()) return res.status(400).json({ message: "restaurentOwnerId is required" });

    const [district, owner] = await Promise.all([
      prisma.district.findUnique({ where: { id: districtId }, select: { id: true } }),
      prisma.restaurent_owner.findUnique({ where: { id: restaurentOwnerId }, select: { id: true } }),
    ]);

    if (!district) return res.status(400).json({ message: "District not found" });
    if (!owner) return res.status(400).json({ message: "Restaurant owner not found" });

    const restaurant = await prisma.restaurent.create({
      data: {
        name: name.trim(),
        address: address.trim(),
        profile_logo: typeof profile_logo === "string" ? profile_logo : "",
        districtId,
        description: typeof description === "string" ? description : null,
        rating: typeof rating === "number" ? rating : 0,
        menu: Array.isArray(menu) && menu.every((item) => typeof item === "string") ? menu : [],
        food_category: typeof food_category === "string" ? (food_category as any) : "VEG_AND_NONVEG",
        images: Array.isArray(images) && images.every((item) => typeof item === "string") ? images : [],
        latitude: typeof latitude === "number" ? latitude : 0,
        longitude: typeof longitude === "number" ? longitude : 0,
        phone_number: typeof phone_number === "string" ? phone_number : null,
        whatsapp_number: typeof whatsapp_number === "string" ? whatsapp_number : null,
        email: typeof email === "string" ? email : null,
        website: typeof website === "string" ? website : null,
        booking_enabled: typeof booking_enabled === "boolean" ? booking_enabled : true,
        status: "APPROVED",
        restaurentOwnerId,
      },
      include: { district: { include: { state: true } }, restaurentOwner: { select: ownerSelect } },
    });

    return res.status(201).json({ message: "Restaurant created", restaurant });
  } catch (error) {
    return handleError(res, error);
  }
};

export const updateRestaurantAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { name, address, districtId, profile_logo, description, rating, food_category, menu, images, latitude, longitude, phone_number, whatsapp_number, email, website, booking_enabled } = req.body ?? {};
    const existing = await prisma.restaurent.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Restaurant not found" });

    const restaurant = await prisma.restaurent.update({
      where: { id },
      data: {
        ...(typeof name === "string" && name.trim() ? { name: name.trim() } : {}),
        ...(typeof address === "string" && address.trim() ? { address: address.trim() } : {}),
        ...(typeof districtId === "string" && districtId.trim() ? { districtId } : {}),
        ...(typeof profile_logo === "string" ? { profile_logo } : {}),
        ...(typeof description === "string" ? { description } : {}),
        ...(typeof rating === "number" ? { rating } : {}),
        ...(typeof food_category === "string" ? { food_category: food_category as any } : {}),
        ...(Array.isArray(menu) && menu.every((item) => typeof item === "string") ? { menu } : {}),
        ...(Array.isArray(images) && images.every((item) => typeof item === "string") ? { images } : {}),
        ...(typeof latitude === "number" ? { latitude } : {}),
        ...(typeof longitude === "number" ? { longitude } : {}),
        ...(typeof phone_number === "string" || phone_number === null ? { phone_number } : {}),
        ...(typeof whatsapp_number === "string" || whatsapp_number === null ? { whatsapp_number } : {}),
        ...(typeof email === "string" || email === null ? { email } : {}),
        ...(typeof website === "string" || website === null ? { website } : {}),
        ...(typeof booking_enabled === "boolean" ? { booking_enabled } : {}),
      },
      include: { district: { include: { state: true } }, restaurentOwner: { select: ownerSelect } },
    });

    return res.status(200).json({ message: "Restaurant updated", restaurant });
  } catch (error) {
    return handleError(res, error);
  }
};

export const updateRestaurantStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { status } = req.body ?? {};
    if (status !== "PENDING" && status !== "APPROVED" && status !== "REJECTED") {
      return res.status(400).json({ message: "Invalid restaurant status" });
    }
    const restaurant = await prisma.restaurent.update({ where: { id }, data: { status } });
    return res.status(200).json({ message: "Restaurant status updated", restaurant });
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

export const listCountries = async (_req: Request, res: Response) => {
  try {
    const countries = await prisma.country.findMany({
      include: { _count: { select: { states: true } } },
      orderBy: { name: "asc" },
    });
    return res.status(200).json({ countries });
  } catch (error) {
    return handleError(res, error);
  }
};

export const createCountry = async (req: Request, res: Response) => {
  try {
    const { name, isServiceAvailable } = req.body ?? {};
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "name is required" });
    }
    const country = await prisma.country.create({
      data: {
        name: name.trim(),
        isServiceAvailable: typeof isServiceAvailable === "boolean" ? isServiceAvailable : false,
      },
      include: { _count: { select: { states: true } } },
    });
    return res.status(201).json({ message: "Country created", country });
  } catch (error) {
    return handleError(res, error);
  }
};

export const deleteCountry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const states = await prisma.state.count({ where: { countryId: id } });
    if (states > 0) {
      return res
        .status(409)
        .json({ message: `Cannot delete country: it still has ${states} state(s). Delete them first.` });
    }
    await prisma.country.delete({ where: { id } });
    return res.status(200).json({ message: "Country deleted" });
  } catch (error) {
    return handleError(res, error);
  }
};

export const createState = async (req: Request, res: Response) => {
  try {
    const { name, countryId, isServiceAvailable, primaryImage } = req.body ?? {};
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "name is required" });
    }
    if (typeof countryId !== "string" || !countryId.trim()) {
      return res.status(400).json({ message: "countryId is required" });
    }
    const country = await prisma.country.findUnique({ where: { id: countryId } });
    if (!country) {
      return res.status(400).json({ message: "Country not found" });
    }
    const state = await prisma.state.create({
      data: {
        name: name.trim(),
        countryId,
        isServiceAvailable: typeof isServiceAvailable === "boolean" ? isServiceAvailable : false,
        primaryImage:
          typeof primaryImage === "string" && primaryImage.trim().length > 0
            ? primaryImage.trim()
            : null,
      },
      include: { country: true, _count: { select: { districts: true } } },
    });
    return res.status(201).json({ message: "State created", state });
  } catch (error) {
    return handleError(res, error);
  }
};

export const deleteState = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const districts = await prisma.district.count({ where: { stateId: id } });
    if (districts > 0) {
      return res
        .status(409)
        .json({ message: `Cannot delete state: it still has ${districts} district(s). Delete them first.` });
    }
    await prisma.state.delete({ where: { id } });
    return res.status(200).json({ message: "State deleted" });
  } catch (error) {
    return handleError(res, error);
  }
};

export const createDistrict = async (req: Request, res: Response) => {
  try {
    const { name, stateId, isServiceAvailable, autoApprovePlaces } = req.body ?? {};
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "name is required" });
    }
    if (typeof stateId !== "string" || !stateId.trim()) {
      return res.status(400).json({ message: "stateId is required" });
    }
    const state = await prisma.state.findUnique({ where: { id: stateId } });
    if (!state) {
      return res.status(400).json({ message: "State not found" });
    }
    const district = await prisma.district.create({
      data: {
        name: name.trim(),
        stateId,
        isServiceAvailable: typeof isServiceAvailable === "boolean" ? isServiceAvailable : false,
        autoApprovePlaces: typeof autoApprovePlaces === "boolean" ? autoApprovePlaces : false,
      },
      include: { state: { include: { country: true } } },
    });
    return res.status(201).json({ message: "District created", district });
  } catch (error) {
    return handleError(res, error);
  }
};

export const deleteDistrict = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const [places, hotels, restaurants, submissions] = await Promise.all([
      prisma.place.count({ where: { districtId: id } }),
      prisma.hotel.count({ where: { districtId: id } }),
      prisma.restaurent.count({ where: { districtId: id } }),
      prisma.place_submission.count({ where: { districtId: id } }),
    ]);
    if (places + hotels + restaurants + submissions > 0) {
      return res.status(409).json({
        message: `Cannot delete district: it still has ${places} place(s), ${hotels} hotel(s), ${restaurants} restaurant(s) and ${submissions} submission(s).`,
      });
    }
    await prisma.district.delete({ where: { id } });
    return res.status(200).json({ message: "District deleted" });
  } catch (error) {
    return handleError(res, error);
  }
};

export const createPlace = async (req: Request, res: Response) => {
  try {
    const { name, description, districtId, images, entryfee, category, latitude, longitude } = req.body ?? {};
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "name is required" });
    }
    if (typeof districtId !== "string" || !districtId.trim()) {
      return res.status(400).json({ message: "districtId is required" });
    }
    const district = await prisma.district.findUnique({ where: { id: districtId } });
    if (!district) {
      return res.status(400).json({ message: "District not found" });
    }
    const place = await prisma.place.create({
      data: {
        name: name.trim(),
        description: typeof description === "string" ? description : "",
        districtId,
        images: Array.isArray(images) && images.every((i) => typeof i === "string") ? images : [],
        entryfee: typeof entryfee === "number" ? entryfee : 0,
        category: typeof category === "string" ? category : "",
        latitude: typeof latitude === "number" ? latitude : 0,
        longitude: typeof longitude === "number" ? longitude : 0,
        status: "APPROVED",
      },
      include: { district: { include: { state: { include: { country: true } } } } },
    });
    return res.status(201).json({ message: "Place created", place });
  } catch (error) {
    return handleError(res, error);
  }
};

export const deletePlace = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const [guides, bookings, submissions, favs] = await Promise.all([
      prisma.specific_guide.count({ where: { placeid: id } }),
      prisma.common_guide_places.count({ where: { placeId: id } }),
      prisma.place_submission.count({ where: { placeId: id } }),
      prisma.user_fav_place.count({ where: { placeId: id } }),
    ]);
    if (guides + bookings + submissions + favs > 0) {
      return res.status(409).json({
        message: `Cannot delete place: it still has ${guides} guide(s), ${bookings} booking reference(s), ${submissions} submission(s) and ${favs} favourite(s).`,
      });
    }
    await prisma.place.delete({ where: { id } });
    return res.status(200).json({ message: "Place deleted" });
  } catch (error) {
    return handleError(res, error);
  }
};

export const deleteHotel = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    await prisma.hotel.delete({ where: { id } });
    return res.status(200).json({ message: "Hotel deleted" });
  } catch (error) {
    return handleError(res, error);
  }
};

export const deleteRestaurant = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    await prisma.restaurent.delete({ where: { id } });
    return res.status(200).json({ message: "Restaurant deleted" });
  } catch (error) {
    return handleError(res, error);
  }
};

export const deleteSpecificGuide = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const [testimonials, submissions] = await Promise.all([
      prisma.testimonials.count({ where: { specificguideId: id } }),
      prisma.place_submission.count({ where: { specificGuideId: id } }),
    ]);
    if (testimonials + submissions > 0) {
      return res.status(409).json({
        message: `Cannot delete guide: remove its ${testimonials} review(s) and ${submissions} submission(s) first.`,
      });
    }
    await prisma.specific_guide.delete({ where: { id } });
    return res.status(200).json({ message: "Guide deleted" });
  } catch (error) {
    return handleError(res, error);
  }
};

export const deleteCommonGuide = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const [testimonials, submissions] = await Promise.all([
      prisma.testimonials.count({ where: { commonGuideId: id } }),
      prisma.place_submission.count({ where: { commonGuideId: id } }),
    ]);
    if (testimonials + submissions > 0) {
      return res.status(409).json({
        message: `Cannot delete guide: remove its ${testimonials} review(s) and ${submissions} submission(s) first.`,
      });
    }
    await prisma.common_guide.delete({ where: { id } });
    return res.status(200).json({ message: "Guide deleted" });
  } catch (error) {
    return handleError(res, error);
  }
};

export const deleteHotelOwner = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    await prisma.hotel_owner.delete({ where: { id } });
    return res.status(200).json({ message: "Hotel owner deleted" });
  } catch (error) {
    return handleError(res, error);
  }
};

export const deleteRestaurantOwner = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    await prisma.restaurent_owner.delete({ where: { id } });
    return res.status(200).json({ message: "Restaurant owner deleted" });
  } catch (error) {
    return handleError(res, error);
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const [testimonials, favs] = await Promise.all([
      prisma.testimonials.count({ where: { userId: id } }),
      prisma.user_fav_place.count({ where: { userId: id } }),
    ]);
    if (testimonials + favs > 0) {
      return res.status(409).json({
        message: `Cannot delete user: remove its ${testimonials} review(s) and ${favs} favourite(s) first.`,
      });
    }
    await prisma.user.delete({ where: { id } });
    return res.status(200).json({ message: "User deleted" });
  } catch (error) {
    return handleError(res, error);
  }
};

export const deleteTestimonial = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    await prisma.testimonials.delete({ where: { id } });
    return res.status(200).json({ message: "Review deleted" });
  } catch (error) {
    return handleError(res, error);
  }
};
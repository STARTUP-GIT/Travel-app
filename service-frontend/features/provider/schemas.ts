import { z } from "zod";

import { FOOD_CATEGORIES, type FoodCategory } from "@/features/provider/types";

const foodCategories = FOOD_CATEGORIES.map((option) => option.value) as [
  FoodCategory,
  ...FoodCategory[],
];

/**
 * Mirrors `hotelCreateSchema` / `restaurentCreateSchema` in the backend
 * (`backend/src/services/zod.ts`). Only the fields an owner can actually set are
 * collected here: `rating` and `review` belong to travellers, and the backend
 * forces a new listing to zero, so they are never submitted.
 */
export const venueSchema = z.object({
  name: z.string().trim().min(1, "Give the listing a name"),
  address: z
    .string()
    .trim()
    .min(1, "Add the address travellers should visit"),
  profileLogo: z
    .string()
    .trim()
    .url("The photo must be a full image URL")
    .or(z.literal(""))
    .refine((value) => value.length > 0, "Add a cover photo URL"),
  districtId: z.string().min(1, "Choose a district"),
  description: z
    .string()
    .trim()
    .max(2000, "Keep the description under 2000 characters"),
  costPerNight: z.coerce
    .number({ invalid_type_error: "Enter a nightly price" })
    .int("The price must be a whole number")
    .min(0, "The price cannot be negative"),
  latitude: z.coerce
    .number({ invalid_type_error: "Enter a latitude" })
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90"),
  longitude: z.coerce
    .number({ invalid_type_error: "Enter a longitude" })
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180"),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{10,15}$/, "Enter a valid phone number")
    .or(z.literal("")),
  whatsapp: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{10,15}$/, "Enter a valid WhatsApp number")
    .or(z.literal("")),
  email: z.string().trim().email("Enter a valid email").or(z.literal("")),
  website: z
    .string()
    .trim()
    .url("Enter a full website URL, starting with https://")
    .or(z.literal("")),
  foodCategory: z.enum(foodCategories, {
    errorMap: () => ({ message: "Choose a food category" }),
  }),
  menu: z.array(z.string().trim().min(1, "Menu items cannot be blank")),
});

export type VenuePayload = z.output<typeof venueSchema>;

/**
 * Numeric fields come from `<input type="number">` as text and are coerced by
 * the schema, so the form state is typed `string | number` rather than zod's
 * inferred input type.
 */
export type VenueValues = Omit<VenuePayload, "costPerNight" | "latitude" | "longitude"> & {
  costPerNight: string | number;
  latitude: string | number;
  longitude: string | number;
};

export function emptyVenue(): VenueValues {
  return {
    name: "",
    address: "",
    profileLogo: "",
    districtId: "",
    description: "",
    costPerNight: 0,
    latitude: "",
    longitude: "",
    phone: "",
    whatsapp: "",
    email: "",
    website: "",
    foodCategory: "PUREVEG",
    menu: [],
  };
}

export const hotelRoomTypeAdditionalServiceSchema = z.object({
  name: z.string().trim().min(1, "Service name cannot be empty"),
  type: z.enum(["INCLUDED", "EXTRA_CHARGE", "UNAVAILABLE"]),
  price: z.coerce.number().min(0).optional(),
  priceBasis: z.string().trim().optional(),
  description: z.string().trim().optional(),
});

export const hotelRoomTypeSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, "Room title is required"),
  description: z.string().trim().min(1, "Room description is required"),
  category: z.string().trim().optional(),
  roomType: z.enum(["AC", "NON_AC"]),
  maxOccupancy: z.coerce.number().int().min(1, "Capacity must be at least 1 guest"),
  availableRooms: z.coerce.number().int().min(0, "Available rooms cannot be negative"),
  pricePerNight: z.coerce.number().min(0, "Price per night cannot be negative"),
  roomOverviewPhoto: z.string().trim().min(1, "Room overview photo is required"),
  bathroomPhoto: z.string().trim().min(1, "Bathroom photo is required"),
  images: z.array(z.string()).default([]),
  hasHotWater: z.boolean().default(false),
  hotWaterCharge: z.coerce.number().min(0).nullable().optional(),
  hasTv: z.boolean().default(false),
  hasAttachedBathroom: z.boolean().default(false),
  hasWifi: z.boolean().default(false),
  facilities: z.array(z.string()).default([]),
  additionalServices: z.array(hotelRoomTypeAdditionalServiceSchema).default([]),
  conditions: z.string().trim().optional(),
  isActive: z.boolean().default(true),
  displayOrder: z.coerce.number().int().default(0),
});

export type HotelRoomTypeValues = z.infer<typeof hotelRoomTypeSchema>;

export const hotelFormSchema = z.object({
  name: z.string().trim().min(1, "Hotel name is required"),
  address: z.string().trim().min(1, "Physical address is required"),
  profileLogo: z.string().trim().min(1, "Hotel cover photo is required"),
  stateId: z.string().min(1, "Please select a state"),
  districtId: z.string().min(1, "Please select a district"),
  description: z.string().trim().max(2000, "Description must be under 2000 characters").default(""),
  mapsUrl: z.string().trim().optional(),
  starRating: z.coerce.number().int().min(1).max(5).nullable().optional(),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{10,15}$/, "Enter a valid phone number")
    .or(z.literal(""))
    .default(""),
  whatsapp: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{10,15}$/, "Enter a valid WhatsApp number")
    .or(z.literal(""))
    .default(""),
  email: z.string().trim().email("Enter a valid email").or(z.literal("")).default(""),
  website: z
    .string()
    .trim()
    .url("Enter a valid website URL starting with https://")
    .or(z.literal(""))
    .default(""),
  specifyTimes: z.boolean().default(false),
  checkInTimeType: z.enum(["SPECIFIC", "RANGE"]).optional(),
  checkInTime: z.string().trim().optional(),
  checkInStartTime: z.string().trim().optional(),
  checkInEndTime: z.string().trim().optional(),
  checkOutTimeType: z.enum(["SPECIFIC", "RANGE"]).optional(),
  checkOutTime: z.string().trim().optional(),
  checkOutStartTime: z.string().trim().optional(),
  checkOutEndTime: z.string().trim().optional(),
  roomTypes: z.array(hotelRoomTypeSchema).min(1, "Add at least one room type"),
});

export type HotelFormValues = z.infer<typeof hotelFormSchema>;

export function emptyRoomType(order = 0): HotelRoomTypeValues {
  return {
    title: "",
    description: "",
    category: "",
    roomType: "AC",
    maxOccupancy: 2,
    availableRooms: 5,
    pricePerNight: 1500,
    roomOverviewPhoto: "",
    bathroomPhoto: "",
    images: [],
    hasHotWater: true,
    hotWaterCharge: null,
    hasTv: true,
    hasAttachedBathroom: true,
    hasWifi: true,
    facilities: ["Hot Water", "Television", "Attached Bathroom", "Wi-Fi"],
    additionalServices: [
      { name: "Drinking water", type: "INCLUDED" },
      { name: "Breakfast", type: "INCLUDED" },
    ],
    conditions: "",
    isActive: true,
    displayOrder: order,
  };
}

export function emptyHotel(): HotelFormValues {
  return {
    name: "",
    address: "",
    profileLogo: "",
    stateId: "",
    districtId: "",
    description: "",
    mapsUrl: "",
    starRating: null,
    phone: "",
    whatsapp: "",
    email: "",
    website: "",
    specifyTimes: false,
    checkInTimeType: "SPECIFIC",
    checkInTime: "12:00 PM",
    checkInStartTime: "12:00 PM",
    checkInEndTime: "08:00 PM",
    checkOutTimeType: "SPECIFIC",
    checkOutTime: "11:00 AM",
    checkOutStartTime: "06:00 AM",
    checkOutEndTime: "11:00 AM",
    roomTypes: [emptyRoomType(0)],
  };
}


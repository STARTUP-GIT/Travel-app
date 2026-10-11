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
  roomCategory: z.enum(["PRIVATE", "DORMITORY"]).default("PRIVATE").optional(),
  bedType: z.string().optional(),
  dormGender: z.enum(["MIXED", "FEMALE", "MALE"]).optional(),
  bedCapacity: z.coerce.number().int().optional(),
  pricingUnit: z.enum(["PER_ROOM", "PER_BED"]).default("PER_ROOM").optional(),
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
  propertyType: z.enum(["HOTEL", "STAY"]).default("HOTEL").optional(),
  stayCategory: z.string().optional(),
  accommodationRules: z.string().optional(),
  cancellationPolicy: z.string().optional(),
  activities: z.array(z.string()).default([]),
  facilities: z.array(z.string()).default([]),
  roomTypes: z.array(hotelRoomTypeSchema).min(1, "Add at least one room type"),
});

export type HotelFormValues = z.infer<typeof hotelFormSchema>;

export const STAY_CATEGORIES = [
  { value: "backpacker_hostel", label: "Backpacker Hostel", blurb: "Vibrant community hostel with dorms & shared spaces" },
  { value: "hostel", label: "Youth Hostel", blurb: "Budget-friendly shared & private accommodation" },
  { value: "homestay", label: "Homestay", blurb: "Authentic local host stay with homely comfort" },
  { value: "guesthouse", label: "Guesthouse", blurb: "Cozy private rooms with personal hospitality" },
  { value: "other", label: "Other Accommodation", blurb: "Cottages, camps, villas, and experiential stays" },
] as const;

export const STAY_FACILITIES = [
  "Common room / Lounge",
  "Free High-speed Wi-Fi",
  "Guest kitchen / Microwave",
  "Cafe / Bar / Eatery",
  "Luggage storage",
  "Personal lockers",
  "Coworking desks",
  "Rooftop terrace",
  "Laundry service / Washer",
  "Board games & Book swap",
  "24/7 Reception",
  "Guitar / Music instruments",
  "Outdoor garden / Courtyard",
  "Power backup",
  "Hot showers",
] as const;

export const STAY_ACTIVITIES = [
  "Guided walking tours",
  "Evening bonfire sessions",
  "Social game & movie nights",
  "Morning yoga / meditation",
  "Local cooking workshops",
  "Weekend hiking & cycling",
  "Pub crawls / Cafe hopping",
  "Live music & acoustic jams",
] as const;

export const stayRoomTypeSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, "Room title is required"),
  description: z.string().trim().min(1, "Description is required"),
  roomCategory: z.enum(["DORMITORY", "PRIVATE"]).default("DORMITORY"),
  bedType: z.string().trim().default("Bunk bed"),
  dormGender: z.enum(["MIXED", "FEMALE", "MALE"]).default("MIXED"),
  bedCapacity: z.coerce.number().int().min(1, "Bed capacity must be at least 1"),
  roomType: z.enum(["AC", "NON_AC"]).default("AC"),
  maxOccupancy: z.coerce.number().int().min(1, "Max occupancy must be at least 1"),
  availableRooms: z.coerce.number().int().min(0, "Available beds/rooms cannot be negative"),
  pricePerNight: z.coerce.number().min(0, "Nightly rate cannot be negative"),
  pricingUnit: z.enum(["PER_BED", "PER_ROOM"]).default("PER_BED"),
  roomOverviewPhoto: z.string().trim().default(""),
  bathroomPhoto: z.string().trim().default(""),
  images: z.array(z.string()).default([]),
  hasHotWater: z.boolean().default(true),
  hasTv: z.boolean().default(false),
  hasAttachedBathroom: z.boolean().default(true),
  hasWifi: z.boolean().default(true),
  facilities: z.array(z.string()).default([]),
  additionalServices: z.array(hotelRoomTypeAdditionalServiceSchema).default([]),
  conditions: z.string().trim().optional(),
  isActive: z.boolean().default(true),
  displayOrder: z.coerce.number().int().default(0),
});

export type StayRoomTypeValues = z.infer<typeof stayRoomTypeSchema>;

export const stayFormSchema = z.object({
  name: z.string().trim().min(1, "Stay name is required"),
  address: z.string().trim().min(1, "Address is required"),
  profileLogo: z.string().trim().min(1, "Cover photo is required"),
  stateId: z.string().min(1, "Please select a state"),
  districtId: z.string().min(1, "Please select an enabled district"),
  stayCategory: z.string().min(1, "Select a stay category").default("backpacker_hostel"),
  description: z.string().trim().max(2000, "Description must be under 2000 characters").default(""),
  mapsUrl: z.string().trim().optional(),
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
  facilities: z.array(z.string()).default([]),
  accommodationRules: z.string().trim().default(""),
  cancellationPolicy: z.string().trim().default("Free cancellation up to 24 hours prior to check-in"),
  activities: z.array(z.string()).default([]),
  specifyTimes: z.boolean().default(true),
  checkInTimeType: z.enum(["SPECIFIC", "RANGE"]).default("RANGE"),
  checkInTime: z.string().trim().default("01:00 PM"),
  checkInStartTime: z.string().trim().default("01:00 PM"),
  checkInEndTime: z.string().trim().default("10:00 PM"),
  checkOutTimeType: z.enum(["SPECIFIC", "RANGE"]).default("SPECIFIC"),
  checkOutTime: z.string().trim().default("11:00 AM"),
  checkOutStartTime: z.string().trim().default("08:00 AM"),
  checkOutEndTime: z.string().trim().default("11:00 AM"),
  roomTypes: z.array(stayRoomTypeSchema).min(1, "Add at least one dorm bed or private room"),
});

export type StayFormValues = z.infer<typeof stayFormSchema>;

export function emptyStayRoomType(order = 0, isDorm = true): StayRoomTypeValues {
  return {
    title: isDorm ? "6-Bed Mixed Dormitory" : "Deluxe Private Room",
    description: isDorm
      ? "Spacious air-conditioned dorm with personal lockers, reading lights, power sockets and privacy curtains."
      : "Cozy private room with attached bathroom, plush bed, and serene ambiance for couples or solo explorers.",
    roomCategory: isDorm ? "DORMITORY" : "PRIVATE",
    bedType: isDorm ? "Bunk bed" : "Double bed",
    dormGender: "MIXED",
    bedCapacity: isDorm ? 6 : 2,
    roomType: "AC",
    maxOccupancy: isDorm ? 1 : 2,
    availableRooms: isDorm ? 6 : 2,
    pricePerNight: isDorm ? 549 : 1799,
    pricingUnit: isDorm ? "PER_BED" : "PER_ROOM",
    roomOverviewPhoto: "",
    bathroomPhoto: "",
    images: [],
    hasHotWater: true,
    hasTv: !isDorm,
    hasAttachedBathroom: true,
    hasWifi: true,
    facilities: isDorm
      ? ["Attached Bathroom", "Hot Water", "High-speed Wi-Fi", "Personal Locker", "Reading Light & Plug Point", "Air Conditioning"]
      : ["Attached Bathroom", "Hot Water", "High-speed Wi-Fi", "Air Conditioning", "Fresh Linen & Towels"],
    additionalServices: [
      { name: "Breakfast", type: "INCLUDED" },
      { name: "Towel on rent", type: "EXTRA_CHARGE", price: 50, priceBasis: "PER_DAY" },
    ],
    conditions: "",
    isActive: true,
    displayOrder: order,
  };
}

export function emptyStay(): StayFormValues {
  return {
    name: "",
    address: "",
    profileLogo: "",
    stateId: "",
    districtId: "",
    stayCategory: "backpacker_hostel",
    description: "",
    mapsUrl: "",
    phone: "",
    whatsapp: "",
    email: "",
    website: "",
    facilities: [
      "Common room / Lounge",
      "Free High-speed Wi-Fi",
      "Guest kitchen / Microwave",
      "Luggage storage",
      "Personal lockers",
      "Rooftop terrace",
    ],
    accommodationRules: "• Check-in from 1:00 PM. Valid government photo ID required.\n• Quiet hours from 11:00 PM to 7:00 AM.\n• Outside visitors not permitted in dorm rooms.\n• Non-smoking in all indoor areas.",
    cancellationPolicy: "Free cancellation up to 24 hours prior to check-in. Non-refundable thereafter.",
    activities: [
      "Guided walking tours",
      "Evening bonfire sessions",
      "Social game & movie nights",
    ],
    specifyTimes: true,
    checkInTimeType: "RANGE",
    checkInTime: "01:00 PM",
    checkInStartTime: "01:00 PM",
    checkInEndTime: "10:00 PM",
    checkOutTimeType: "SPECIFIC",
    checkOutTime: "11:00 AM",
    checkOutStartTime: "08:00 AM",
    checkOutEndTime: "11:00 AM",
    roomTypes: [emptyStayRoomType(0, true)],
  };
}

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
    propertyType: "HOTEL",
    stayCategory: "",
    accommodationRules: "",
    cancellationPolicy: "",
    activities: [],
    facilities: [],
    roomTypes: [emptyRoomType(0)],
  };
}

export const restaurantDishSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Dish name is required"),
  description: z.string().trim().default(""),
  foodCategory: z.enum(["PUREVEG", "NONVEG", "VEG_AND_NONVEG"]).default("VEG_AND_NONVEG"),
  price: z.coerce.number().min(0, "Price cannot be negative").nullable().optional(),
  image: z.string().trim().optional(),
  isAvailable: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
});

export type RestaurantDishValues = z.infer<typeof restaurantDishSchema>;

export const restaurantBranchSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Branch name is required"),
  address: z.string().trim().min(1, "Address is required"),
  stateId: z.string().min(1, "Select state for branch"),
  districtId: z.string().min(1, "Select district for branch"),
  mapsUrl: z.string().trim().optional(),
  latitude: z.coerce.number().default(0),
  longitude: z.coerce.number().default(0),
  phone: z.string().trim().default(""),
  whatsapp: z.string().trim().default(""),
  email: z.string().trim().default(""),
  openingTime: z.string().trim().default(""),
  closingTime: z.string().trim().default(""),
  bookingEnabled: z.boolean().default(true),
  profileLogo: z.string().trim().default(""),
  images: z.array(z.string()).default([]),
});

export type RestaurantBranchValues = z.infer<typeof restaurantBranchSchema>;

export const restaurantFormSchema = z.object({
  name: z.string().trim().min(1, "Restaurant name is required"),
  address: z.string().trim().min(1, "Physical address is required"),
  profileLogo: z.string().trim().min(1, "Cover photo is required"),
  stateId: z.string().min(1, "Choose a state"),
  districtId: z.string().min(1, "Choose a district"),
  description: z.string().trim().default(""),
  mapsUrl: z.string().trim().default(""),
  phone: z.string().trim().regex(/^[0-9+\-\s]{10,15}$/, "Enter a valid phone number").or(z.literal("")).default(""),
  whatsapp: z.string().trim().regex(/^[0-9+\-\s]{10,15}$/, "Enter a valid WhatsApp number").or(z.literal("")).default(""),
  email: z.string().trim().email("Enter a valid email").or(z.literal("")).default(""),
  website: z.string().trim().url("Enter a valid website URL starting with https://").or(z.literal("")).default(""),
  foodCategory: z.enum(["PUREVEG", "NONVEG", "VEG_AND_NONVEG"]).default("VEG_AND_NONVEG"),
  openingTime: z.string().trim().default("09:00 AM"),
  closingTime: z.string().trim().default("10:30 PM"),
  bookingEnabled: z.boolean().default(true),
  hasBranches: z.boolean().default(false),
  images: z.array(z.string()).default([]),
  dishes: z.array(restaurantDishSchema).default([]),
  branches: z.array(restaurantBranchSchema).default([]),
});

export type RestaurantFormValues = z.infer<typeof restaurantFormSchema>;

export function emptyRestaurantDish(order = 0): RestaurantDishValues {
  return {
    name: "",
    description: "",
    foodCategory: "VEG_AND_NONVEG",
    price: 250,
    image: "",
    isAvailable: true,
    displayOrder: order,
  };
}

export function emptyRestaurantBranch(parentName = ""): RestaurantBranchValues {
  return {
    name: parentName,
    address: "",
    stateId: "",
    districtId: "",
    mapsUrl: "",
    latitude: 0,
    longitude: 0,
    phone: "",
    whatsapp: "",
    email: "",
    openingTime: "09:00 AM",
    closingTime: "10:30 PM",
    bookingEnabled: true,
    profileLogo: "",
    images: [],
  };
}

export function emptyRestaurant(): RestaurantFormValues {
  return {
    name: "",
    address: "",
    profileLogo: "",
    stateId: "",
    districtId: "",
    description: "",
    mapsUrl: "",
    phone: "",
    whatsapp: "",
    email: "",
    website: "",
    foodCategory: "VEG_AND_NONVEG",
    openingTime: "09:00 AM",
    closingTime: "10:30 PM",
    bookingEnabled: true,
    hasBranches: false,
    images: [],
    dishes: [emptyRestaurantDish(0)],
    branches: [],
  };
}


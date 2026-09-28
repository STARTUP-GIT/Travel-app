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

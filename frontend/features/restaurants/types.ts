import type { District } from "@/features/locations/types";

export type FoodCategory = "PUREVEG" | "NONVEG" | "VEG_AND_NONVEG";

export type Restaurent = {
  id: string;
  name: string;
  address: string;
  profile_logo: string;
  districtId: string;
  description?: string | null;
  rating: number;
  review: string[];
  menu: string[];
  food_category: FoodCategory;
  images: string[];
  latitude: number;
  longitude: number;
  phone_number?: string | null;
  whatsapp_number?: string | null;
  email?: string | null;
  website?: string | null;
  booking_enabled: boolean;
  createdAt: string;
  updatedAt: string;
  district?: District;
};
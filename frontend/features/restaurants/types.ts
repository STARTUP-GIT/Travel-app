import type { ContentStatus, District } from "@/features/locations/types";

export type FoodCategory = "PUREVEG" | "NONVEG" | "VEG_AND_NONVEG";

export type RestaurantDish = {
  id: string;
  restaurantId: string;
  name: string;
  description?: string | null;
  foodCategory: FoodCategory;
  price?: number | null;
  image?: string | null;
  isAvailable: boolean;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

export type RestaurantBranch = {
  id: string;
  name: string;
  address: string;
  profile_logo?: string;
  districtId: string;
  latitude: number;
  longitude: number;
  maps_url?: string | null;
  phone_number?: string | null;
  whatsapp_number?: string | null;
  email?: string | null;
  website?: string | null;
  opening_time?: string | null;
  closing_time?: string | null;
  booking_enabled: boolean;
  food_category?: FoodCategory;
  district?: District;
};

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
  maps_url?: string | null;
  phone_number?: string | null;
  whatsapp_number?: string | null;
  email?: string | null;
  website?: string | null;
  opening_time?: string | null;
  closing_time?: string | null;
  booking_enabled: boolean;
  has_branches?: boolean;
  parent_restaurant_id?: string | null;
  branches?: RestaurantBranch[];
  dishes?: RestaurantDish[];
  /** Approval state; only APPROVED content is customer visible. */
  status?: ContentStatus;
  createdAt: string;
  updatedAt: string;
  district?: District;
};
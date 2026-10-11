import type { ContentStatus, District } from "@/features/locations/types";

export type HotelRoomTypeAdditionalService = {
  name: string;
  type: "INCLUDED" | "EXTRA_CHARGE" | "UNAVAILABLE";
  price?: number;
  priceBasis?: string;
  description?: string;
};

export type HotelRoomType = {
  id: string;
  hotelId: string;
  title: string;
  description: string;
  category?: string | null;
  roomType: "AC" | "NON_AC";
  maxOccupancy: number;
  availableRooms: number;
  pricePerNight: number;
  roomOverviewPhoto: string;
  bathroomPhoto: string;
  images?: string[];
  hasHotWater: boolean;
  hotWaterCharge?: number | null;
  hasTv: boolean;
  hasAttachedBathroom: boolean;
  hasWifi: boolean;
  facilities?: string[];
  additionalServices?: HotelRoomTypeAdditionalService[] | null;
  conditions?: string | null;
  isActive?: boolean;
  displayOrder?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type Hotel = {
  id: string;
  name: string;
  address: string;
  profile_logo: string;
  districtId: string;
  description?: string | null;
  rating: number;
  review: string[];
  cost_per_night: number;
  images: string[];
  latitude: number;
  longitude: number;
  phone_number?: string | null;
  whatsapp_number?: string | null;
  email?: string | null;
  website?: string | null;
  booking_enabled: boolean;
  /** Approval state; only APPROVED content is customer visible. */
  status?: ContentStatus;
  star_rating?: number | null;
  maps_url?: string | null;
  check_in_time_type?: "SPECIFIC" | "RANGE" | null;
  check_in_time?: string | null;
  check_in_start_time?: string | null;
  check_in_end_time?: string | null;
  check_out_time_type?: "SPECIFIC" | "RANGE" | null;
  check_out_time?: string | null;
  check_out_start_time?: string | null;
  check_out_end_time?: string | null;
  room_types?: HotelRoomType[];
  createdAt: string;
  updatedAt: string;
  district?: District;
};

export type CreateHotelBookingInput = {
  hotelId: string;
  roomTypeId?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  selectedAddOns?: { name: string; price: number; priceBasis?: string }[];
  notes?: string;
};
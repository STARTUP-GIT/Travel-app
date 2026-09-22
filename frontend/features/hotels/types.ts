import type { District } from "@/features/locations/types";

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
  createdAt: string;
  updatedAt: string;
  district?: District;
};

export type CreateHotelBookingInput = {
  hotelId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
};
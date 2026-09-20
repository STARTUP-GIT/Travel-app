import prisma from "../db/prisma.js";
import type { authProviders, Food_Category } from "../generated/client/enums.js";
import type { bookingStatus } from "./bookingStatus.js";

export type HotelOwnerRecord = {
  id: string;
  name: string;
  username: string;
  email: string;
  password: string;
  phone_number: string;
  profile_pic: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type RestaurentOwnerRecord = {
  id: string;
  name: string;
  username: string;
  email: string;
  password: string;
  phone_number: string;
  profile_pic: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type HotelRecord = {
  id: string;
  name: string;
  address: string;
  profile_logo: string;
  districtId: string;
  description: string | null;
  rating: number;
  review: string[];
  cost_per_night: number;
  images: string[];
  latitude: number;
  longitude: number;
  phone_number: string | null;
  whatsapp_number: string | null;
  email: string | null;
  website: string | null;
  booking_enabled: boolean;
  hotelOwnerId: string;
  createdAt: Date;
  updatedAt: Date;
  district?: {
    id: string;
    name: string;
    isServiceAvailable: boolean;
  };
  hotel_owner?: HotelOwnerRecord;
};

export type RestaurentRecord = {
  id: string;
  name: string;
  address: string;
  districtId: string;
  description: string | null;
  rating: number;
  review: string[];
  menu: string[];
  food_category: Food_Category;
  images: string[];
  profile_logo: string;
  latitude: number;
  longitude: number;
  phone_number: string | null;
  whatsapp_number: string | null;
  email: string | null;
  website: string | null;
  booking_enabled: boolean;
  restaurentOwnerId: string;
  createdAt: Date;
  updatedAt: Date;
  district?: {
    id: string;
    name: string;
    isServiceAvailable: boolean;
  };
  restaurent_owner?: RestaurentOwnerRecord;
};

export type UserRecord = {
  id: string;
  name: string;
  username: string;
  email: string;
  password: string | null;
  phonenumber: string;
  profilepic: string | null;
  authprovider: authProviders | null;
  createdAt: Date;
  updatedAt: Date;
};

export type HotelBookingRecord = {
  id: string;
  hotelId: string;
  userId: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  rooms: number;
  totalAmount: number;
  status: bookingStatus;
  createdAt: Date;
  updatedAt: Date;
  hotel?: {
    id: string;
    name: string;
    address: string;
    profile_logo: string;
    districtId: string;
    hotelOwnerId: string;
    booking_enabled: boolean;
    phone_number: string | null;
    whatsapp_number: string | null;
  };
  user?: UserRecord;
};

export type RestaurantReservationRecord = {
  id: string;
  restaurantId: string;
  userId: string;
  reservationDate: Date;
  guests: number;
  status: bookingStatus;
  createdAt: Date;
  updatedAt: Date;
  restaurent?: {
    id: string;
    name: string;
    address: string;
    profile_logo: string;
    districtId: string;
    restaurentOwnerId: string;
    booking_enabled: boolean;
    phone_number: string | null;
    whatsapp_number: string | null;
  };
  user?: UserRecord;
};

export interface OwnerDelegate<TRecord extends Record<string, unknown>> {
  findUnique(args: Record<string, unknown>): Promise<TRecord | null>;
  findFirst(args: Record<string, unknown>): Promise<TRecord | null>;
  findMany(args?: Record<string, unknown>): Promise<TRecord[]>;
  create(args: Record<string, unknown>): Promise<TRecord>;
  update(args: Record<string, unknown>): Promise<TRecord>;
  delete(args: Record<string, unknown>): Promise<TRecord>;
  count(args?: Record<string, unknown>): Promise<number>;
}

export interface OwnerQueryClient {
  hotel_owner: OwnerDelegate<HotelOwnerRecord>;
  restaurent_owner: OwnerDelegate<RestaurentOwnerRecord>;
  hotel: OwnerDelegate<HotelRecord>;
  restaurent: OwnerDelegate<RestaurentRecord>;
  hotel_booking: OwnerDelegate<HotelBookingRecord>;
  restaurant_reservation: OwnerDelegate<RestaurantReservationRecord>;
}

export const ownerPrisma = prisma as unknown as OwnerQueryClient;
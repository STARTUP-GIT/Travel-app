import type { CommonGuide, SpecificGuide } from "@/features/guides/types";
import type { Hotel } from "@/features/hotels/types";
import type { Restaurent } from "@/features/restaurants/types";
import type { Place } from "@/features/places/types";

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED";

export type HotelBooking = {
  id: string;
  hotelId: string;
  userId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  totalAmount: number;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  hotel: Hotel;
};

export type RestaurantReservation = {
  id: string;
  restaurantId: string;
  userId: string;
  reservationDate: string;
  guests: number;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  restaurent: Restaurent;
};

export type SpecificGuideBooking = {
  id: string;
  userId: string;
  specificGuideId: string;
  placeId: string;
  bookingDate: string;
  bookingTime?: string | null;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  specificGuide: SpecificGuide;
  place: Place;
};

export type CommonGuideBooking = {
  id: string;
  userId: string;
  commonGuideId: string;
  bookingDate: string;
  bookingTime?: string | null;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  commonGuide: CommonGuide;
  selectedPlaces: {
    id: string;
    placeId: string;
    place: Place;
  }[];
};

export type CreateSpecificGuideBookingInput = {
  specificGuideId: string;
  bookingDate: string;
  bookingTime?: string;
};

export type CreateCommonGuideBookingInput = {
  commonGuideId: string;
  placeIds: string[];
  bookingDate: string;
  bookingTime?: string;
};

export type CreateReservationInput = {
  restaurantId: string;
  reservationDate: string;
  guests: number;
};
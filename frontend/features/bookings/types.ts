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
  tripStartTime?: string | null;
  numberOfPeople?: number;
  pickupName?: string | null;
  pickupAddress?: string | null;
  pickupMapsUrl?: string | null;
  requestedPickupName?: string | null;
  requestedPickupAddress?: string | null;
  requestedPickupMapsUrl?: string | null;
  totalPrice?: number;
  cancellationPolicy?: string | null;
  foodStatus?: string | null;
  foodDetails?: string | null;
  transportStatus?: string | null;
  transportDetails?: string | null;
  entryFeeStatus?: string | null;
  entryFeeDetails?: string | null;
  additionalCostsDetails?: string | null;
  paymentStatus?: string;
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
  packageId?: string | null;
  package?: {
    id: string;
    name: string;
    description?: string | null;
    price?: number;
    pricingMode?: string;
    pricingUnit?: string;
  } | null;
  bookingDate: string;
  bookingTime?: string | null;
  tripStartTime?: string | null;
  numberOfPeople?: number;
  pickupName?: string | null;
  pickupAddress?: string | null;
  pickupMapsUrl?: string | null;
  requestedPickupName?: string | null;
  requestedPickupAddress?: string | null;
  requestedPickupMapsUrl?: string | null;
  pricingMode?: string;
  pricingUnit?: string;
  totalPrice?: number;
  cancellationPolicy?: string | null;
  foodStatus?: string | null;
  foodDetails?: string | null;
  transportStatus?: string | null;
  transportDetails?: string | null;
  entryFeeStatus?: string | null;
  entryFeeDetails?: string | null;
  additionalCostsDetails?: string | null;
  paymentStatus?: string;
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
  numberOfPeople?: number;
  pickupName?: string;
  pickupAddress?: string;
  pickupMapsUrl?: string;
  requestedPickupName?: string;
  requestedPickupAddress?: string;
  requestedPickupMapsUrl?: string;
  totalPrice?: number;
};

export type CreateCommonGuideBookingInput = {
  commonGuideId: string;
  packageId?: string;
  placeIds: string[];
  bookingDate: string;
  bookingTime?: string;
  tripStartTime?: string;
  numberOfPeople?: number;
  pricingMode?: string;
  pricingUnit?: string;
  totalPrice?: number;
  pickupName?: string;
  pickupAddress?: string;
  pickupMapsUrl?: string;
  requestedPickupName?: string;
  requestedPickupAddress?: string;
  requestedPickupMapsUrl?: string;
};

export type CreateReservationInput = {
  restaurantId: string;
  reservationDate: string;
  guests: number;
};
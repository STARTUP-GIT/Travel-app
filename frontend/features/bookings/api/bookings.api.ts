import { api } from "@/lib/api/client";
import type {
  CommonGuideBooking,
  CreateCommonGuideBookingInput,
  CreateSpecificGuideBookingInput,
  HotelBooking,
  RestaurantReservation,
  SpecificGuideBooking,
} from "@/features/bookings/types";
import { listReservations } from "@/features/reservations/api/reservations.api";

export async function createSpecificGuideBooking(
  input: CreateSpecificGuideBookingInput
): Promise<SpecificGuideBooking> {
  const data = await api.post<{ booking?: SpecificGuideBooking }>(
    "/users/booking/api/specific-guide-bookings",
    { body: input }
  );
  return data.booking as SpecificGuideBooking;
}

export async function createCommonGuideBooking(
  input: CreateCommonGuideBookingInput
): Promise<CommonGuideBooking> {
  const data = await api.post<{
    booking?: CommonGuideBooking;
    numberOfPlaces?: number;
  }>("/users/booking/api/common-guide-bookings", { body: input });
  return data.booking as CommonGuideBooking;
}

export async function listSpecificGuideBookings(): Promise<SpecificGuideBooking[]> {
  return api.get<SpecificGuideBooking[]>(
    "/users/booking/api/specific-guide-bookings"
  );
}

export async function listCommonGuideBookings(): Promise<CommonGuideBooking[]> {
  return api.get<CommonGuideBooking[]>(
    "/users/booking/api/common-guide-bookings"
  );
}

export async function listHotelBookings(): Promise<HotelBooking[]> {
  return api.get<HotelBooking[]>("/users/booking/api/hotel-bookings");
}

export type AllBookings = {
  hotelBookings: HotelBooking[];
  restaurantReservations: RestaurantReservation[];
  specificGuideBookings: SpecificGuideBooking[];
  commonGuideBookings: CommonGuideBooking[];
};

export async function listAllBookings(): Promise<AllBookings> {
  const [hotelBookings, restaurantReservations, specificGuideBookings, commonGuideBookings] =
    await Promise.all([
      listHotelBookings().catch(() => []),
      listReservations().catch(() => []),
      listSpecificGuideBookings().catch(() => []),
      listCommonGuideBookings().catch(() => []),
    ]);

  return {
    hotelBookings,
    restaurantReservations,
    specificGuideBookings,
    commonGuideBookings,
  };
}
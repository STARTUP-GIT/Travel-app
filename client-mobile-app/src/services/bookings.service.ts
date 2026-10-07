/**
 * Bookings and reservations.
 *
 * Every route lives under `/users/booking` and is guarded by
 * `userauthMiddleware`, so all of these require a session token. The create
 * routes answer with a wrapper object (`{ booking }` / `{ reservation }`) while
 * the list routes answer with a bare array — that difference is normalised here
 * rather than in the UI.
 *
 * Server-side validation the app must respect before submitting:
 *   - every date must not be in the past (`z.coerce.date()` + a refine)
 *   - hotel check-out must be after check-in
 *   - a Tour Guide booking needs at least one place id
 */

import { api, asRecord } from "@/lib/api/client";
import type {
  CommonGuideBooking,
  CreateCommonGuideBookingInput,
  CreateHotelBookingInput,
  CreateReservationInput,
  CreateSpecificGuideBookingInput,
  HotelBooking,
  RestaurantReservation,
  SpecificGuideBooking,
} from "@/types/api";

function unwrap<T>(response: unknown, key: string): T {
  const wrapped = asRecord(response)[key] as T | undefined;
  if (wrapped) return wrapped;
  throw new Error("The server did not confirm that booking.");
}

/* -------------------------------------------------------------------------- */
/* Hotels                                                                     */
/* -------------------------------------------------------------------------- */

export async function createHotelBooking(
  input: CreateHotelBookingInput,
): Promise<HotelBooking> {
  return unwrap<HotelBooking>(
    await api.post("/users/booking/api/hotel-bookings", input),
    "booking",
  );
}

export async function listHotelBookings(): Promise<HotelBooking[]> {
  return api.get<HotelBooking[]>("/users/booking/api/hotel-bookings");
}

/* -------------------------------------------------------------------------- */
/* Restaurants                                                                */
/* -------------------------------------------------------------------------- */

export async function createReservation(
  input: CreateReservationInput,
): Promise<RestaurantReservation> {
  return unwrap<RestaurantReservation>(
    await api.post("/users/booking/api/restaurant-reservations", input),
    "reservation",
  );
}

export async function listReservations(): Promise<RestaurantReservation[]> {
  return api.get<RestaurantReservation[]>("/users/booking/api/restaurant-reservations");
}

/* -------------------------------------------------------------------------- */
/* Guides                                                                     */
/* -------------------------------------------------------------------------- */

export async function createSpecificGuideBooking(
  input: CreateSpecificGuideBookingInput,
): Promise<SpecificGuideBooking> {
  return unwrap<SpecificGuideBooking>(
    await api.post("/users/booking/api/specific-guide-bookings", input),
    "booking",
  );
}

export async function listSpecificGuideBookings(): Promise<SpecificGuideBooking[]> {
  return api.get<SpecificGuideBooking[]>("/users/booking/api/specific-guide-bookings");
}

export async function createTourGuideBooking(
  input: CreateCommonGuideBookingInput,
): Promise<CommonGuideBooking> {
  return unwrap<CommonGuideBooking>(
    await api.post("/users/booking/api/common-guide-bookings", input),
    "booking",
  );
}

export async function listTourGuideBookings(): Promise<CommonGuideBooking[]> {
  return api.get<CommonGuideBooking[]>("/users/booking/api/common-guide-bookings");
}

/* -------------------------------------------------------------------------- */
/* Combined                                                                   */
/* -------------------------------------------------------------------------- */

export type AllBookings = {
  hotelBookings: HotelBooking[];
  restaurantReservations: RestaurantReservation[];
  specificGuideBookings: SpecificGuideBooking[];
  tourGuideBookings: CommonGuideBooking[];
  total: number;
};

/**
 * All four booking lists for the signed-in customer.
 *
 * Each list degrades to empty on its own failure so one endpoint being down
 * cannot hide the other three — the Bookings screen shows whatever exists plus
 * an error for the part that failed, instead of an empty page.
 */
export async function listAllBookings(): Promise<AllBookings> {
  const [hotelBookings, restaurantReservations, specificGuideBookings, tourGuideBookings] =
    await Promise.all([
      listHotelBookings().catch(() => [] as HotelBooking[]),
      listReservations().catch(() => [] as RestaurantReservation[]),
      listSpecificGuideBookings().catch(() => [] as SpecificGuideBooking[]),
      listTourGuideBookings().catch(() => [] as CommonGuideBooking[]),
    ]);

  return {
    hotelBookings,
    restaurantReservations,
    specificGuideBookings,
    tourGuideBookings,
    total:
      hotelBookings.length +
      restaurantReservations.length +
      specificGuideBookings.length +
      tourGuideBookings.length,
  };
}
import { api } from "@/lib/api/client";
import type {
  CreateReservationInput,
  RestaurantReservation,
} from "@/features/bookings/types";

export async function createReservation(
  input: CreateReservationInput
): Promise<RestaurantReservation> {
  const data = await api.post<{ reservation?: RestaurantReservation }>(
    "/users/booking/api/restaurant-reservations",
    { body: input }
  );
  return data.reservation as RestaurantReservation;
}

export async function listReservations(): Promise<RestaurantReservation[]> {
  return api.get<RestaurantReservation[]>(
    "/users/booking/api/restaurant-reservations"
  );
}
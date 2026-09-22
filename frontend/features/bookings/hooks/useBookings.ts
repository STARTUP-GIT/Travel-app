"use client";

import { useAsync } from "@/lib/hooks/use-async";
import { listAllBookings } from "../api/bookings.api";

export function useBookings() {
  return useAsync(() => listAllBookings().catch(() => ({
    hotelBookings: [],
    restaurantReservations: [],
    specificGuideBookings: [],
    commonGuideBookings: [],
  })), []);
}
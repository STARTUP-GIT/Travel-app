"use client";

import { useAsync } from "@/lib/hooks/use-async";
import { getHotelById, getHotels } from "../api/hotels.api";

export function useHotels(districtId?: string) {
  return useAsync(() => getHotels(districtId).catch(() => []), [districtId]);
}

export function useHotel(districtId: string | undefined, hotelId: string | undefined) {
  return useAsync(
    () => {
      if (!districtId || !hotelId) return Promise.resolve(undefined);
      return getHotelById(districtId, hotelId).catch(() => undefined);
    },
    [districtId, hotelId]
  );
}
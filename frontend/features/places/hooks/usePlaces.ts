"use client";

import { useAsync } from "@/lib/hooks/use-async";
import { getPlaceById, getPlacesByDistrict } from "../api/places.api";

export function usePlacesByDistrict(districtId: string | undefined) {
  return useAsync(
    () => {
      if (!districtId) return Promise.resolve([]);
      return getPlacesByDistrict(districtId).catch(() => []);
    },
    [districtId]
  );
}

export function usePlace(
  districtId: string | undefined,
  placeId: string | undefined
) {
  return useAsync(
    () => {
      if (!districtId || !placeId) return Promise.resolve(undefined);
      return getPlaceById(districtId, placeId).catch(() => undefined);
    },
    [districtId, placeId]
  );
}
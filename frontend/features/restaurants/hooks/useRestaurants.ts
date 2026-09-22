"use client";

import { useAsync } from "@/lib/hooks/use-async";
import { getRestaurantById, getRestaurants } from "../api/restaurants.api";

export function useRestaurants(districtId?: string) {
  return useAsync(
    () => getRestaurants(districtId).catch(() => []),
    [districtId]
  );
}

export function useRestaurant(
  districtId: string | undefined,
  restaurantId: string | undefined
) {
  return useAsync(
    () => {
      if (!districtId || !restaurantId) return Promise.resolve(undefined);
      return getRestaurantById(districtId, restaurantId).catch(() => undefined);
    },
    [districtId, restaurantId]
  );
}
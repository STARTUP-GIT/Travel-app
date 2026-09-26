import { api } from "@/lib/api/client";
import { memoizedGet } from "@/lib/api/cache";
import type { Restaurent } from "@/features/restaurants/types";

/**
 * Restaurant list endpoint is mounted under `/:districtId/services/restaurant`,
 * so a real district id is required (no hardcoded state segment). The handler
 * returns every approved restaurant with its district hierarchy, so callers
 * still scope the result themselves.
 */
export async function getRestaurants(
  districtId: string
): Promise<Restaurent[]> {
  if (!districtId) {
    throw new Error("getRestaurants requires a district id");
  }
  return memoizedGet(`restaurants:${districtId}`, () =>
    api.get<Restaurent[]>(
      `/${districtId}/services/restaurant/api/restaurants`
    )
  );
}

/** Restaurants scoped to a single district. */
export async function getRestaurantsForDistrict(
  districtId: string
): Promise<Restaurent[]> {
  if (!districtId) return [];
  const restaurants = await getRestaurants(districtId);
  return restaurants.filter(
    (r) => (r.districtId ?? r.district?.id) === districtId
  );
}

export async function getRestaurantById(
  districtId: string,
  restaurantId: string
): Promise<Restaurent> {
  return api.get<Restaurent>(
    `/${districtId}/services/restaurant/api/restaurants/${restaurantId}`
  );
}
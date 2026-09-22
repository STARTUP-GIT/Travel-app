import { api } from "@/lib/api/client";
import { memoizedGet } from "@/lib/api/cache";
import type { Restaurent } from "@/features/restaurants/types";

const SERVICE_SEGMENT = "karnataka";

export async function getRestaurants(
  districtId?: string
): Promise<Restaurent[]> {
  const segment = districtId ?? SERVICE_SEGMENT;
  return memoizedGet(`restaurants:${segment}`, () =>
    api.get<Restaurent[]>(`/${segment}/services/restaurant/api/restaurants`)
  );
}

/** Restaurants scoped to a single district. */
export async function getRestaurantsForDistrict(
  districtId: string
): Promise<Restaurent[]> {
  const restaurants = await getRestaurants();
  return restaurants.filter((r) => r.districtId === districtId);
}

export async function getRestaurantById(
  districtId: string,
  restaurantId: string
): Promise<Restaurent> {
  return api.get<Restaurent>(
    `/${districtId}/services/restaurant/api/restaurants/${restaurantId}`
  );
}
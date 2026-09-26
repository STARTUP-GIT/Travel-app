import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RestaurantView } from "@/features/restaurants/ui/restaurant-view";
import { getRestaurantById } from "@/features/restaurants/api/restaurants.api";
import {
  requireDistrictResource,
  resolveStateDistrict,
  tryStateDistrict,
} from "@/features/locations/server";
import { DistrictUnavailable } from "@/components/shared/district-unavailable";

type RouteParams = {
  stateSlug: string;
  districtSlug: string;
  restaurantId: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { stateSlug, districtSlug, restaurantId } = await params;
  const resolved = await tryStateDistrict(stateSlug, districtSlug);
  if (!resolved) return { title: "Restaurant" };
  const { district } = resolved;
  try {
    const restaurant = await getRestaurantById(district.id, restaurantId);
    requireDistrictResource(restaurant, district);
    return {
      title: `${restaurant.name} · ${district.name}`,
      description:
        restaurant.description?.slice(0, 160) ??
        `${restaurant.name} in ${district.name}.`,
    };
  } catch {
    return { title: "Restaurant" };
  }
}

export default async function RestaurantPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { stateSlug, districtSlug, restaurantId } = await params;
  const resolution = await resolveStateDistrict(stateSlug, districtSlug);
  if (resolution.status === "error") {
    return <DistrictUnavailable message={resolution.message} />;
  }
  if (resolution.status === "missing") notFound();
  const { state, district } = resolution;

  const restaurant = await getRestaurantById(district.id, restaurantId)
    .then((r) => requireDistrictResource(r, district))
    .catch(() => notFound());

  return (
    <RestaurantView
      restaurant={restaurant}
      districtSlug={district.slug}
      stateSlug={state.slug}
    />
  );
}

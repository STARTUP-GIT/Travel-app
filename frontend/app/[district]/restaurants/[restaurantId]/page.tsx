import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RestaurantView } from "@/features/restaurants/ui/restaurant-view";
import { getRestaurantById } from "@/features/restaurants/api/restaurants.api";
import { requireDistrict, requireDistrictResource } from "@/features/locations/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ district: string; restaurantId: string }>;
}): Promise<Metadata> {
  const { district: slug, restaurantId } = await params;
  try {
    const district = await requireDistrict(slug);
    const restaurant = await getRestaurantById(district.id, restaurantId);
    requireDistrictResource(restaurant, district);
    return {
      title: `${restaurant.name} · ${district.name}`,
      description: restaurant.description?.slice(0, 160) ?? `${restaurant.name} in ${district.name}, Karnataka.`,
    };
  } catch {
    return { title: "Restaurant" };
  }
}

export default async function RestaurantPage({
  params,
}: {
  params: Promise<{ district: string; restaurantId: string }>;
}) {
  const { district: slug, restaurantId } = await params;
  const district = await requireDistrict(slug);
  const restaurant = await getRestaurantById(district.id, restaurantId)
    .then((r) => requireDistrictResource(r, district))
    .catch(() => notFound());

  return <RestaurantView restaurant={restaurant} districtSlug={slug} />;
}
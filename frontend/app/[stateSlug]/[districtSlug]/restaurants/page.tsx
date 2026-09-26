import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UtensilsCrossed } from "lucide-react";

import { ScreenHeader } from "@/components/shared/screen-header";
import { EmptyState } from "@/components/shared/states";
import { RestaurantCard } from "@/features/restaurants/ui/restaurant-card";
import { getRestaurantsForDistrict } from "@/features/restaurants/api/restaurants.api";
import { resolveStateDistrict, tryStateDistrict } from "@/features/locations/server";
import { DistrictUnavailable } from "@/components/shared/district-unavailable";

type RouteParams = { stateSlug: string; districtSlug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { stateSlug, districtSlug } = await params;
  const resolved = await tryStateDistrict(stateSlug, districtSlug);
  if (!resolved) return { title: "Restaurants" };
  const { state, district } = resolved;
  return {
    title: `Restaurants in ${district.name}`,
    description: `Dine out in ${district.name}, ${state.name}.`,
  };
}

export default async function RestaurantsPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { stateSlug, districtSlug } = await params;
  const resolution = await resolveStateDistrict(stateSlug, districtSlug);
  if (resolution.status === "error") {
    return <DistrictUnavailable message={resolution.message} />;
  }
  if (resolution.status === "missing") notFound();
  const { state, district } = resolution;

  const restaurants = (
    await getRestaurantsForDistrict(district.id).catch(() => [])
  ).filter(
    (restaurant) =>
      restaurant.status === "APPROVED" &&
      (restaurant.districtId ?? restaurant.district?.id) === district.id
  );

  return (
    <div className="pb-6">
      <ScreenHeader
        title="Restaurants"
        subtitle={`${district.name} district · ${restaurants.length} place${restaurants.length === 1 ? "" : "s"} to eat`}
        backHref={`/${state.slug}/${district.slug}`}
      />
      <div className="app-container">
        {restaurants.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            title="No restaurants published yet"
            description={`There are no approved restaurants in ${district.name} right now. Check back soon!`}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {restaurants.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                districtSlug={district.slug}
                stateSlug={state.slug}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

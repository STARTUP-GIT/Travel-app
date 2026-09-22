import type { Metadata } from "next";
import { UtensilsCrossed } from "lucide-react";

import { ScreenHeader } from "@/components/shared/screen-header";
import { EmptyState } from "@/components/shared/states";
import { RestaurantCard } from "@/features/restaurants/ui/restaurant-card";
import { getRestaurantsForDistrict } from "@/features/restaurants/api/restaurants.api";
import { requireDistrict } from "@/features/locations/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ district: string }>;
}): Promise<Metadata> {
  const { district: slug } = await params;
  try {
    const district = await requireDistrict(slug);
    return { title: `Restaurants in ${district.name}`, description: `Dine out in ${district.name}, Karnataka.` };
  } catch {
    return { title: "Restaurants" };
  }
}

export default async function RestaurantsPage({
  params,
}: {
  params: Promise<{ district: string }>;
}) {
  const { district: slug } = await params;
  const district = await requireDistrict(slug);
  const restaurants = await getRestaurantsForDistrict(district.id).catch(() => []);

  return (
    <div className="pb-6">
      <ScreenHeader
        title="Restaurants"
        subtitle={`${district.name} district · ${restaurants.length} place${restaurants.length === 1 ? "" : "s"} to eat`}
        backHref={`/${slug}`}
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
            {restaurants.map((r) => (
              <RestaurantCard key={r.id} restaurant={r} districtSlug={slug} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
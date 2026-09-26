import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Hotel } from "lucide-react";

import { ScreenHeader } from "@/components/shared/screen-header";
import { EmptyState } from "@/components/shared/states";
import { HotelCard } from "@/features/hotels/ui/hotel-card";
import { getHotelsForDistrict } from "@/features/hotels/api/hotels.api";
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
  if (!resolved) return { title: "Hotels" };
  const { state, district } = resolved;
  return {
    title: `Hotels in ${district.name}`,
    description: `Book stays in ${district.name}, ${state.name}.`,
  };
}

export default async function HotelsPage({
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

  const hotels = (await getHotelsForDistrict(district.id).catch(() => [])).filter(
    (hotel) =>
      hotel.status === "APPROVED" &&
      (hotel.districtId ?? hotel.district?.id) === district.id
  );

  return (
    <div className="pb-6">
      <ScreenHeader
        title="Hotels"
        subtitle={`${district.name} district · ${hotels.length} stay${hotels.length === 1 ? "" : "s"}`}
        backHref={`/${state.slug}/${district.slug}`}
      />
      <div className="app-container">
        {hotels.length === 0 ? (
          <EmptyState
            icon={Hotel}
            title="No hotels published yet"
            description={`There are no approved hotels in ${district.name} right now. Check back soon!`}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hotels.map((hotel) => (
              <HotelCard
                key={hotel.id}
                hotel={hotel}
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

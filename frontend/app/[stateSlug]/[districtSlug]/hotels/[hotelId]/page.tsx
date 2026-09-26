import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { HotelView } from "@/features/hotels/ui/hotel-view";
import { getHotelById } from "@/features/hotels/api/hotels.api";
import {
  requireDistrictResource,
  resolveStateDistrict,
  tryStateDistrict,
} from "@/features/locations/server";
import { DistrictUnavailable } from "@/components/shared/district-unavailable";

type RouteParams = { stateSlug: string; districtSlug: string; hotelId: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { stateSlug, districtSlug, hotelId } = await params;
  const resolved = await tryStateDistrict(stateSlug, districtSlug);
  if (!resolved) return { title: "Hotel" };
  const { district } = resolved;
  try {
    const hotel = await getHotelById(district.id, hotelId);
    requireDistrictResource(hotel, district);
    return {
      title: `${hotel.name} · ${district.name}`,
      description:
        hotel.description?.slice(0, 160) ?? `${hotel.name} in ${district.name}.`,
    };
  } catch {
    return { title: "Hotel" };
  }
}

export default async function HotelPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { stateSlug, districtSlug, hotelId } = await params;
  const resolution = await resolveStateDistrict(stateSlug, districtSlug);
  if (resolution.status === "error") {
    return <DistrictUnavailable message={resolution.message} />;
  }
  if (resolution.status === "missing") notFound();
  const { state, district } = resolution;

  const hotel = await getHotelById(district.id, hotelId)
    .then((h) => requireDistrictResource(h, district))
    .catch(() => notFound());

  return (
    <HotelView
      hotel={hotel}
      districtSlug={district.slug}
      stateSlug={state.slug}
    />
  );
}

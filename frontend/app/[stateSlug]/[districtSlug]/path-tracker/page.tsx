import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PathTrackerHub } from "./path-tracker-hub";
import { getPlacesByDistrict } from "@/features/places/api/places.api";
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
  if (!resolved) return { title: "Path Tracker" };
  const { district } = resolved;
  return {
    title: `Path Tracker · ${district.name}`,
    description: "Track your journey through real phone GPS, place by place.",
  };
}

export default async function PathTrackerPage({
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

  const places = (await getPlacesByDistrict(district.id).catch(() => [])).filter(
    (place) =>
      place.status === "APPROVED" &&
      (place.districtId ?? place.district?.id) === district.id
  );

  return (
    <PathTrackerHub
      districtSlug={district.slug}
      stateSlug={state.slug}
      places={places}
    />
  );
}

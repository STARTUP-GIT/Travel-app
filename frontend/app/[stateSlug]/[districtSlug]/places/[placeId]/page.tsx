import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PlaceView } from "@/features/places/ui/place-view";
import { getPlaceById } from "@/features/places/api/places.api";
import { ApiError } from "@/lib/api/client";
import type { Place } from "@/features/places/types";
import {
  requireDistrictResource,
  resolveStateDistrict,
  tryStateDistrict,
} from "@/features/locations/server";
import { DistrictUnavailable } from "@/components/shared/district-unavailable";

type RouteParams = { stateSlug: string; districtSlug: string; placeId: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { stateSlug, districtSlug, placeId } = await params;
  const resolved = await tryStateDistrict(stateSlug, districtSlug);
  if (!resolved) return { title: "Place" };
  const { district } = resolved;
  try {
    const place = await getPlaceById(district.id, placeId);
    requireDistrictResource(place, district);
    return {
      title: `${place.name} · ${district.name}`,
      description: place.description?.slice(0, 160),
    };
  } catch {
    return { title: "Place" };
  }
}

export default async function PlaceInfoPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { stateSlug, districtSlug, placeId } = await params;
  const resolution = await resolveStateDistrict(stateSlug, districtSlug);
  if (resolution.status === "error") {
    return <DistrictUnavailable message={resolution.message} />;
  }
  if (resolution.status === "missing") notFound();
  const { state, district } = resolution;

  let place: Place;
  try {
    place = await getPlaceById(district.id, placeId);
  } catch (error) {
    // Only a genuine "no such place" is a 404. Swallowing every other failure
    // (backend 5xx, network error, timeout) into notFound() reported real
    // server faults as "This page could not be found", which hid the actual
    // error and sent people looking for a missing place record.
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  requireDistrictResource(place, district);

  return (
    <PlaceView
      key={place.id}
      place={place}
      districtSlug={district.slug}
      stateSlug={state.slug}
    />
  );
}

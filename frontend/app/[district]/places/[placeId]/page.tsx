import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PlaceView } from "@/features/places/ui/place-view";
import { getPlaceById } from "@/features/places/api/places.api";
import { requireDistrict, requireDistrictResource } from "@/features/locations/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ district: string; placeId: string }>;
}): Promise<Metadata> {
  const { district: slug, placeId } = await params;
  try {
    const district = await requireDistrict(slug);
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
  params: Promise<{ district: string; placeId: string }>;
}) {
  const { district: slug, placeId } = await params;
  const district = await requireDistrict(slug);

  const place = await getPlaceById(district.id, placeId)
    .then((p) => requireDistrictResource(p, district))
    .catch(() => notFound());

  return (
    <PlaceView
      key={place.id}
      place={place}
      districtSlug={slug}
    />
  );
}
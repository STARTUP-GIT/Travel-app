import type { Metadata } from "next";

import { PathTrackerHub } from "./path-tracker-hub";
import { getPlacesByDistrict } from "@/features/places/api/places.api";
import { requireDistrict } from "@/features/locations/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ district: string }>;
}): Promise<Metadata> {
  const { district: slug } = await params;
  try {
    const district = await requireDistrict(slug);
    return {
      title: `Path Tracker · ${district.name}`,
      description: "Track your journey through real phone GPS, place by place.",
    };
  } catch {
    return { title: "Path Tracker" };
  }
}

export default async function PathTrackerPage({
  params,
}: {
  params: Promise<{ district: string }>;
}) {
  const { district: slug } = await params;
  const district = await requireDistrict(slug);
  const places = await getPlacesByDistrict(district.id).catch(() => []);

  return <PathTrackerHub districtSlug={slug} districtId={district.id} places={places} />;
}
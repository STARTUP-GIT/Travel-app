import type { Metadata } from "next";
import { notFound } from "next/navigation";
import * as React from "react";

import { LiveTrackerScreen } from "@/features/path-tracker/path-tracker/ui/live-tracker-screen";
import { resolveStateDistrict } from "@/features/locations/server";

type RouteParams = { stateSlug: string; districtSlug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { stateSlug, districtSlug } = await params;
  const resolution = await resolveStateDistrict(stateSlug, districtSlug);
  if (resolution.status !== "found") return { title: "Live Path Tracker" };
  return {
    title: `Live Path Tracker · ${resolution.district.name}`,
    description: "Record a real trip with your phone GPS.",
  };
}

export default async function PathTrackerLivePage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { stateSlug, districtSlug } = await params;
  const resolution = await resolveStateDistrict(stateSlug, districtSlug);
  if (resolution.status !== "found") notFound();

  return (
    <React.Suspense fallback={null}>
      <LiveTrackerScreen
        districtId={resolution.district.id}
        districtBase={`/${resolution.state.slug}/${resolution.district.slug}`}
        googleMapsApiKey={process.env.GOOGLE_MAPS_API_KEY ?? ""}
      />
    </React.Suspense>
  );
}

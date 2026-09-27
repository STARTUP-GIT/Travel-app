"use client";

import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { usePlace } from "@/features/places/hooks/usePlaces";
import { LiveTracker } from "./live-tracker";

/**
 * Client host for the live Path Tracker screen. It only resolves the selected
 * place for display context; all tracking runs in `LiveTracker` through the
 * Path Tracker engine.
 */
export function LiveTrackerScreen({
  districtId,
  districtBase,
}: {
  districtId: string;
  districtBase: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const placeId = searchParams.get("placeId") ?? "";
  const fallbackName = searchParams.get("name") ?? "Destination";

  const place = usePlace(districtId, placeId.length ? placeId : undefined);
  const placeData = place.data;

  const placeCoordinate =
    placeData &&
    typeof placeData.latitude === "number" &&
    typeof placeData.longitude === "number"
      ? { latitude: placeData.latitude, longitude: placeData.longitude }
      : null;

  return (
    <LiveTracker
      districtBase={districtBase}
      placeName={placeData?.name ?? fallbackName}
      placeCoordinate={placeCoordinate}
      onTrackAgain={() => router.replace(`${districtBase}/path-tracker/live`)}
    />
  );
}

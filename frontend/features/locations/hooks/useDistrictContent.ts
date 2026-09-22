"use client";

import * as React from "react";

import { useAsync } from "@/lib/hooks/use-async";
import { resolveDistrictBySlug } from "@/features/locations/api/locations.api";
import { getPlacesByDistrict } from "@/features/places/api/places.api";
import { getHotelsForDistrict } from "@/features/hotels/api/hotels.api";
import { getRestaurantsForDistrict } from "@/features/restaurants/api/restaurants.api";
import type { DistrictSummary } from "@/features/locations/types";
import type { Place } from "@/features/places/types";
import type { Hotel } from "@/features/hotels/types";
import type { Restaurent } from "@/features/restaurants/types";

export type DistrictContent = {
  district: DistrictSummary | undefined;
  places: Place[];
  hotels: Hotel[];
  restaurants: Restaurent[];
};

/**
 * Bundles the core district content the home screen renders. District slugs
 * are resolved against real backend data — nothing is hardcoded.
 */
export function useDistrictContent(slug: string | null | undefined) {
  const [districtId, setDistrictId] = React.useState<string | undefined>();
  const [district, setDistrict] = React.useState<DistrictSummary | undefined>();

  React.useEffect(() => {
    let cancelled = false;
    setDistrict(undefined);
    setDistrictId(undefined);
    if (!slug) return;
    resolveDistrictBySlug(slug)
      .then((d) => {
        if (cancelled) return;
        setDistrict(d ?? undefined);
        setDistrictId(d?.id);
      })
      .catch(() => {
        if (!cancelled) setDistrict(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const placesState = useAsync(
    () => (districtId ? getPlacesByDistrict(districtId).catch(() => []) : Promise.resolve([])),
    [districtId]
  );
  const hotelsState = useAsync(
    () => (districtId ? getHotelsForDistrict(districtId).catch(() => []) : Promise.resolve([])),
    [districtId]
  );
  const restaurantsState = useAsync(
    () =>
      districtId ? getRestaurantsForDistrict(districtId).catch(() => []) : Promise.resolve([]),
    [districtId]
  );

  const isLoading =
    districtsLoading(districtId) ||
    placesState.isLoading ||
    hotelsState.isLoading ||
    restaurantsState.isLoading;

  return {
    district,
    places: placesState.data ?? [],
    hotels: hotelsState.data ?? [],
    restaurants: restaurantsState.data ?? [],
    isLoading,
  };
}

function districtsLoading(id: string | undefined) {
  // While the district is still being resolved there is nothing to load.
  return id === undefined;
}
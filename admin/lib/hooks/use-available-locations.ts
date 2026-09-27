"use client";

import { useAdminData } from "@/lib/hooks/use-admin-data";
import type { DistrictAdmin, StateAdmin } from "@/lib/types";

export function useAvailableLocations(stateId: string) {
  const statesResult = useAdminData<{ states: StateAdmin[] }>("/api/states");
  const districtsResult = useAdminData<{ districts: DistrictAdmin[] }>(
    "/api/districts",
    { query: stateId ? { stateId } : undefined, enabled: Boolean(stateId) }
  );

  return {
    states: statesResult.data?.states ?? [],
    districts: (districtsResult.data?.districts ?? []).filter(
      (district) => district.stateId === stateId && district.isServiceAvailable
    ),
    statesLoading: statesResult.loading,
    loading: districtsResult.loading,
    refresh: () => {
      statesResult.refetch();
      districtsResult.refetch();
    },
  };
}
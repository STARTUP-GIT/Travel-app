"use client";

import { useAsync } from "@/lib/hooks/use-async";
import { getDistricts } from "@/features/locations/api/locations.api";

export function useDistricts() {
  return useAsync(() => getDistricts(), []);
}
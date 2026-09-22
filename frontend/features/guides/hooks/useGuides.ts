"use client";

import { useAsync } from "@/lib/hooks/use-async";
import { findGuideInDistrict, listGuidesForDistrict } from "../api/guides.api";
import type { GuideWithContext } from "@/features/guides/types";

export function useGuidesForDistrict(districtId: string | undefined) {
  return useAsync(
    () => {
      if (!districtId) return Promise.resolve([]);
      return listGuidesForDistrict(districtId).catch(() => []);
    },
    [districtId]
  );
}

export function useGuide(
  districtId: string | undefined,
  guideId: string | undefined,
  type?: "specific" | "common"
) {
  return useAsync(
    () => {
      if (!districtId || !guideId) return Promise.resolve(undefined);
      return findGuideInDistrict(districtId, guideId, type).catch(
        () => undefined
      );
    },
    [districtId, guideId, type]
  );
}
"use client";

import { usePathname } from "next/navigation";

import { useCurrentDistrict } from "@/features/locations/state/current-district-provider";
import { getDistrictRoute, isDistrictAppPath } from "@/features/locations/utils/district-route";

export type DistrictShell = {
  /**
   * Root of the district application (`/{stateSlug}/{districtSlug}`) or null
   * when no district is selected. Never a default or first-available district.
   */
  base: string | null;
  /** True only inside the district application. */
  isDistrictApp: boolean;
};

/**
 * Single place that decides whether the district application shell is active.
 *
 * Inside a district route the URL wins, so the shell is correct on the very
 * first paint and can never point at a different district than the one being
 * viewed. On the account screens (/favorites, /profile) the remembered
 * selection is the context, because those routes carry no district segment.
 */
export function useDistrictShell(): DistrictShell {
  const pathname = usePathname();
  const { slug, stateSlug } = useCurrentDistrict();

  const route = getDistrictRoute(pathname);
  const remembered = Boolean(stateSlug && slug);
  const base = route?.base ?? (remembered ? `/${stateSlug}/${slug}` : null);

  return { base, isDistrictApp: Boolean(base) && isDistrictAppPath(pathname) };
}

import "server-only";

import { notFound } from "next/navigation";

import { resolveDistrictBySlug } from "@/features/locations/api/locations.api";
import type { DistrictSummary } from "@/features/locations/types";

/** Resolves a district slug against backend data or 404s. */
export async function requireDistrict(slug: string): Promise<DistrictSummary> {
  const district = await resolveDistrictBySlug(slug);
  if (!district) notFound();
  return district;
}

type DistrictScoped = {
  districtId?: string;
  district?: { id?: string } | null;
};

/**
 * Enforces the URL contract that every resource lives under the district it
 * belongs to (e.g. /mysuru/hotels/123 ⇒ hotel 123 must be a Mysuru hotel).
 */
export function requireDistrictResource<T extends DistrictScoped>(
  resource: T | null | undefined,
  district: Pick<DistrictSummary, "id">
): T {
  const resourceDistrictId = resource?.districtId ?? resource?.district?.id;
  if (!resource || !resourceDistrictId || resourceDistrictId !== district.id) {
    notFound();
  }
  return resource;
}
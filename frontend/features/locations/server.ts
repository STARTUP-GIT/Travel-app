import "server-only";

import { notFound } from "next/navigation";

import {
  getDistricts,
  getDistrictsForState,
  getStateBySlug,
  resolveDistrictBySlug,
} from "@/features/locations/api/locations.api";
import { slugify } from "@/features/locations/utils/slug";
import type { DistrictSummary, StateSummary } from "@/features/locations/types";

/**
 * Resolves a district slug against backend data or 404s.
 *
 * Only enabled districts of enabled states are ever returned, so a disabled
 * location is indistinguishable from one that does not exist.
 */
export async function requireDistrict(slug: string): Promise<DistrictSummary> {
  const district = await resolveDistrictBySlug(slug);
  if (!district) notFound();
  return district;
}

export type StateDistrictResolution =
  | { status: "found"; state: StateSummary; district: DistrictSummary }
  | { status: "missing" }
  | { status: "error"; message: string };

/**
 * Fault-tolerant version of `requireStateDistrict`.
 *
 * Distinguishes "this location does not exist (or is disabled)" from "the
 * backend could not be reached", so pages can render a retry/error state
 * instead of crashing with a 500.
 */
export async function resolveStateDistrict(
  stateSlug: string,
  districtSlug: string
): Promise<StateDistrictResolution> {
  const normalizedState = slugify(stateSlug ?? "");
  const normalizedDistrict = slugify(districtSlug ?? "");
  if (!normalizedState || !normalizedDistrict) return { status: "missing" };

  let state: StateSummary | null = null;
  let districts: DistrictSummary[] = [];
  try {
    state = await getStateBySlug(normalizedState);
    if (!state) return { status: "missing" };
    districts = await getDistrictsForState(state.slug);
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error && error.message
          ? error.message
          : "Destination service is unavailable.",
    };
  }

  const district =
    districts.find((d) => d.slug === normalizedDistrict) ?? null;
  if (!district) return { status: "missing" };
  return { status: "found", state, district };
}

/**
 * Resolves the /{stateSlug}/{districtSlug} URL contract.
 *
 * The state is resolved first and the district is then looked up *inside that
 * state only*, which guarantees a district can never be rendered under the
 * wrong state (e.g. /kerala/mysuru 404s). A missing/disabled state or district
 * produces a 404, never a 500.
 */
export async function requireStateDistrict(
  stateSlug: string,
  districtSlug: string
): Promise<{ state: StateSummary; district: DistrictSummary }> {
  const result = await resolveStateDistrict(stateSlug, districtSlug);
  if (result.status === "found") {
    return { state: result.state, district: result.district };
  }
  notFound();
}

/** Best-effort metadata resolution — never throws, never 404s. */
export async function tryStateDistrict(
  stateSlug: string,
  districtSlug: string
): Promise<{ state: StateSummary; district: DistrictSummary } | null> {
  try {
    return await requireStateDistrict(stateSlug, districtSlug);
  } catch {
    return null;
  }
}

/** Enabled sibling districts of the same state, for the "more districts" rail. */
export async function getSiblingDistricts(
  stateSlug: string,
  excludeDistrictId: string
): Promise<DistrictSummary[]> {
  try {
    const districts = await getDistricts();
    return districts.filter(
      (d) => d.id !== excludeDistrictId && slugify(d.state?.name ?? "") === stateSlug
    );
  } catch {
    return [];
  }
}

type DistrictScoped = {
  districtId?: string;
  district?: { id?: string } | null;
};

/**
 * Enforces the URL contract that every resource lives under the district it
 * belongs to (e.g. /karnataka/mysuru/hotels/123 ⇒ hotel 123 must be a Mysuru
 * hotel).
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

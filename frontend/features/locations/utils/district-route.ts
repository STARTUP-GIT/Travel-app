/**
 * District routing helpers.
 *
 * District pages live at `/{stateSlug}/{districtSlug}/...`. The URL is the only
 * authoritative signal that a district is actually being viewed, so the
 * district application shell (bottom navigation, district-scoped links) is
 * derived from the route itself rather than from a default district, the first
 * available district, or user/profile data.
 */

export type DistrictRoute = {
  stateSlug: string;
  districtSlug: string;
  /** `/{stateSlug}/{districtSlug}` — the root of the district application. */
  base: string;
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Screens that belong to the district application but are not district routes:
 * the account screens the district bottom navigation links to. Saved and
 * Profile are user data that simply stay in the selected district's context,
 * so the district shell stays visible on them.
 */
const DISTRICT_APP_PATHS = new Set(["/favorites", "/profile"]);

/**
 * Parses a pathname into a district route, or returns null when the path is not
 * a district route. A single-segment path (`/`, `/explore`, `/login`, ...) is
 * never a district route, so the global landing and the destination-selection
 * flow can never be mistaken for a district.
 */
export function getDistrictRoute(pathname: string | null): DistrictRoute | null {
  if (!pathname) return null;

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2) return null;

  const [stateSlug, districtSlug] = segments;
  if (!isSlugLike(stateSlug) || !isSlugLike(districtSlug)) return null;

  return { stateSlug, districtSlug, base: `/${stateSlug}/${districtSlug}` };
}

/**
 * True only for screens that belong to the district application. The global
 * landing page, the destination-selection flow and the auth pages are not, so
 * the district shell never appears on them.
 */
export function isDistrictAppPath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (getDistrictRoute(pathname)) return true;
  return DISTRICT_APP_PATHS.has(pathname);
}

function isSlugLike(segment: string): boolean {
  return SLUG_PATTERN.test(segment);
}

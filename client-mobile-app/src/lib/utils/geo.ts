/**
 * Geographic helpers.
 *
 * The customer app renders maps as deep links to the platform map app rather
 * than embedding a WebView, so no map API key is required for place cards,
 * directions or the Path Tracker summary. The distance maths is shared with the
 * Path Tracker so the numbers on screen are the same ones it computes.
 */

export type GeoPoint = {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
};

export type Coordinates = {
  latitude: number;
  longitude: number;
};

const EARTH_RADIUS_KM = 6371;

/**
 * A point is only usable when both coordinates are finite and not both zero —
 * `(0, 0)` is the classic "admin never filled this in" value, and following it
 * to the middle of the ocean is worse than saying the location is unknown.
 */
export function validPoint(p: GeoPoint | null | undefined): p is Coordinates {
  if (!p) return false;
  if (typeof p.latitude !== "number" || typeof p.longitude !== "number") return false;
  if (!Number.isFinite(p.latitude) || !Number.isFinite(p.longitude)) return false;
  return p.latitude !== 0 || p.longitude !== 0;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance in metres (Haversine). */
export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  if (!validPoint(a) || !validPoint(b)) return Number.NaN;
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * 1000 * Math.asin(Math.sqrt(h));
}

/**
 * Directions URL.
 *
 * Google Maps handles the routing so the user gets live traffic, turn-by-turn
 * and whichever map app they have installed. `origin` is only included when the
 * device actually granted a location fix.
 */
export function buildDirectionsUrl(
  dest: Coordinates,
  origin?: GeoPoint,
  travelMode: "driving" | "walking" | "transit" | "bicycling" = "driving",
): string {
  const params: string[] = [];
  if (origin && validPoint(origin)) {
    params.push(`origin=${origin.latitude},${origin.longitude}`);
  }
  params.push(`destination=${dest.latitude},${dest.longitude}`);
  params.push(`travelmode=${travelMode}`);
  return `https://www.google.com/maps/dir/?${params.join("&")}`;
}

/** Opens the place itself in the platform map app. */
export function buildOpenUrl(point: Coordinates, label?: string): string {
  const query = label?.trim()
    ? `?q=${point.latitude},${point.longitude}(${encodeURIComponent(label.trim())})`
    : `?q=${point.latitude},${point.longitude}`;
  return `https://www.google.com/maps/search/${query}`;
}

/** Straight-line distance between two points, in kilometres. */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const meters = haversineMeters(a, b);
  return Number.isFinite(meters) ? meters / 1000 : Number.NaN;
}

/** Turns a coordinate into a rough human address label for the UI. */
export function formatCoordinates(point: GeoPoint): string | null {
  if (!validPoint(point)) return null;
  return `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;
}
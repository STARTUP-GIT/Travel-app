export type GeoPoint = {
  latitude: number | string | null | undefined;
  longitude: number | string | null | undefined;
};

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type MapProvider =
  | { kind: "osm" }
  | { kind: "google"; apiKey?: string }
  | { kind: "mapbox"; accessToken?: string };

export type MapConfig = {
  provider: MapProvider;
  /** Optional display address for the destination label. */
  label?: string;
};

const EARTH_RADIUS_KM = 6371;

/**
 * Parses and normalizes a point to valid finite numeric coordinates, returning
 * null if missing, zeroed, or invalid.
 */
export function parsePoint(p: GeoPoint | null | undefined): Coordinates | null {
  if (!p) return null;
  const lat =
    typeof p.latitude === "number"
      ? p.latitude
      : typeof p.latitude === "string"
        ? parseFloat(p.latitude)
        : NaN;
  const lng =
    typeof p.longitude === "number"
      ? p.longitude
      : typeof p.longitude === "string"
        ? parseFloat(p.longitude)
        : NaN;

  if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
    return { latitude: lat, longitude: lng };
  }
  return null;
}

export function validPoint(p: GeoPoint | null | undefined): p is Coordinates {
  return parsePoint(p) !== null;
}

/** Great-circle distance between two points in meters (Haversine). */
export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const parsedA = parsePoint(a);
  const parsedB = parsePoint(b);
  if (!parsedA || !parsedB) return NaN;

  const lat1 = toRad(parsedA.latitude);
  const lat2 = toRad(parsedB.latitude);
  const dLat = toRad(parsedB.latitude - parsedA.latitude);
  const dLng = toRad(parsedB.longitude - parsedA.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * 1000 * Math.asin(Math.sqrt(h));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Lazily-navigable map provider URLs — OpenStreetMap embed with destination marker. */
export function buildEmbedUrl(
  point: Coordinates,
  zoom = 15,
  userPoint?: Coordinates | null
): string {
  let minLat = point.latitude - 0.005;
  let maxLat = point.latitude + 0.005;
  let minLng = point.longitude - 0.005;
  let maxLng = point.longitude + 0.005;

  if (userPoint) {
    minLat = Math.min(minLat, userPoint.latitude - 0.003);
    maxLat = Math.max(maxLat, userPoint.latitude + 0.003);
    minLng = Math.min(minLng, userPoint.longitude - 0.003);
    maxLng = Math.max(maxLng, userPoint.longitude + 0.003);
  }

  return `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${point.latitude}%2C${point.longitude}`;
}

export function buildDirectionsUrl(
  dest: GeoPoint,
  origin?: GeoPoint | null,
  label?: string
): string {
  const parsedDest = parsePoint(dest);
  if (!parsedDest) return "#";

  const params = new URLSearchParams();
  params.set("api", "1");

  const parsedOrigin = origin ? parsePoint(origin) : null;
  if (parsedOrigin) {
    params.set("origin", `${parsedOrigin.latitude},${parsedOrigin.longitude}`);
  } else {
    // When origin is omitted/denied, Google Maps defaults origin to "My Location"
    // while keeping destination fixed on the place coordinates.
    params.set("origin", "My Location");
  }

  params.set("destination", `${parsedDest.latitude},${parsedDest.longitude}`);
  params.set("travelmode", "driving");

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function buildOpenUrl(point: GeoPoint, label?: string): string {
  const parsed = parsePoint(point);
  if (!parsed) return "#";

  const query = label?.trim()
    ? `${label.trim()}@${parsed.latitude},${parsed.longitude}`
    : `${parsed.latitude},${parsed.longitude}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
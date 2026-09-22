export type GeoPoint = {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
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

/** Great-circle distance between two points in meters (Haversine). */
export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  if (!validPoint(a) || !validPoint(b)) return NaN;
  const lat1 = toRad(a.latitude!);
  const lat2 = toRad(b.latitude!);
  const dLat = toRad(b.latitude! - a.latitude!);
  const dLng = toRad(b.longitude! - a.longitude!);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * 1000 * Math.asin(Math.sqrt(h));
}

export function validPoint(p: GeoPoint): p is Coordinates {
  return (
    typeof p.latitude === "number" &&
    typeof p.longitude === "number" &&
    Number.isFinite(p.latitude) &&
    Number.isFinite(p.longitude) &&
    (p.latitude !== 0 || p.longitude !== 0)
  );
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Lazily-navigable map provider URLs — no credentials needed for OSM. */
export function buildEmbedUrl(point: Coordinates, zoom = 15): string {
  return `https://www.openstreetmap.org/export/embed.html?bbox=${point.longitude - 0.004}%2C${point.latitude - 0.003}%2C${point.longitude + 0.004}%2C${point.latitude + 0.003}&layer=mapnik&marker=${point.latitude}%2C${point.longitude}`;
}

export function buildDirectionsUrl(
  dest: Coordinates,
  origin?: GeoPoint
): string {
  const params = new URLSearchParams();
  if (origin && validPoint(origin)) {
    params.set("origin", `${origin.latitude},${origin.longitude}`);
  }
  params.set("destination", `${dest.latitude},${dest.longitude}`);
  params.set("travelmode", "driving");
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function buildOpenUrl(point: Coordinates, label?: string): string {
  if (label?.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label.trim())}`;
  }
  return `https://www.google.com/maps/?q=${point.latitude},${point.longitude}`;
}
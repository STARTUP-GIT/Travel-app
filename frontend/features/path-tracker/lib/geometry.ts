import { haversineMeters, type GeoPoint } from "@/features/maps/lib/geo";
import type { TripPoint } from "@/features/path-tracker/types";

export function toGeoPoint(p: TripPoint): GeoPoint {
  return { latitude: p.lat, longitude: p.lng };
}

export function toTripPoint(g: {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  timestamp: number;
}): TripPoint {
  return {
    lat: g.latitude,
    lng: g.longitude,
    accuracy: g.accuracy ?? null,
    timestamp: g.timestamp,
  };
}

/**
 * Orthodrome-based helpers for drawing a real recorded route onto a canvas
 * without a map tile provider. Coordinates are projected with a simple
 * equirectangular approximation scoped to the route's bounding box.
 */
export function cumulativeDistance(points: TripPoint[]): number | null {
  if (points.length < 2) return null;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const d = haversineMeters(toGeoPoint(points[i - 1]), toGeoPoint(points[i]));
    if (Number.isFinite(d) && d > 0) total += d;
  }
  return Math.round(total);
}

export type ProjectedPoint = { x: number; y: number };

export function projectPoints(
  points: TripPoint[],
  width = 100,
  height = 100
): ProjectedPoint[] {
  if (points.length === 0) return [];
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const dLat = maxLat - minLat || 0.0005;
  const dLng = maxLng - minLng || 0.0005;
  // Square-ish cell so the route isn't stretched wildly between axes.
  const latScale = height / dLat;
  const lngScale = width / dLng;

  return points.map((p) => ({
    x: +(((p.lng - minLng) * lngScale).toFixed(2)),
    y: +((height - (p.lat - minLat) * latScale).toFixed(2)),
  }));
}

export function formatDuration(startedAt: string | null, endedAt?: string | null): string {
  if (!startedAt) return "—";
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const seconds = Math.max(0, Math.round((end - new Date(startedAt).getTime()) / 1000));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatDistance(meters: number | null): string {
  if (meters === null) return "—";
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}
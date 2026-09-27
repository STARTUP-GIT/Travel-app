import { haversineDistance } from "./geo";
import type { TripPoint } from "../types";

export function toGeoPoint(p: TripPoint): { latitude: number; longitude: number } {
  return { latitude: p.latitude, longitude: p.longitude };
}

export function toTripPoint(g: {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number | null;
  heading?: number;
  speed?: number;
  timestamp: number;
}): TripPoint {
  return {
    latitude: g.latitude,
    longitude: g.longitude,
    altitude: g.altitude,
    accuracy: g.accuracy ?? null,
    heading: g.heading,
    speed: g.speed,
    timestamp: g.timestamp,
    index: 0,
  };
}

export function toTripPointWithIndex(g: {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number | null;
  heading?: number;
  speed?: number;
  timestamp: number;
}, index: number): TripPoint {
  return {
    latitude: g.latitude,
    longitude: g.longitude,
    altitude: g.altitude,
    accuracy: g.accuracy ?? null,
    heading: g.heading,
    speed: g.speed,
    timestamp: g.timestamp,
    index,
  };
}

/**
 * Cumulative distance along a path using Haversine formula.
 */
export function cumulativeDistance(points: TripPoint[]): number | null {
  if (points.length < 2) return null;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const d = haversineDistance(
      { latitude: points[i - 1].latitude, longitude: points[i - 1].longitude },
      { latitude: points[i].latitude, longitude: points[i].longitude }
    );
    if (Number.isFinite(d) && d > 0) total += d;
  }
  return Math.round(total);
}

export function cumulativeDistanceLegacy(points: { lat: number; lng: number }[]): number | null {
  if (points.length < 2) return null;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const d = haversineDistance(
      { latitude: points[i - 1].lat, longitude: points[i - 1].lng },
      { latitude: points[i].lat, longitude: points[i].lng }
    );
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
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
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
    x: +(((p.longitude - minLng) * lngScale).toFixed(2)),
    y: +((height - (p.latitude - minLat) * latScale).toFixed(2)),
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
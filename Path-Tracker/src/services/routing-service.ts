import { Coordinate } from '../types';
import { RoutingConfig } from '../constants/theme';

/**
 * Online walking routing service (OSRM public demo, free, no API key).
 * Returns a polyline from origin to destination for RETURN TO START guidance.
 */

const BASE = process.env.EXPO_PUBLIC_ROUTING_BASE_URL ?? RoutingConfig.baseUrl;

export interface RouteResult {
  coordinates: Coordinate[];
  distanceMeters: number;
  durationSeconds: number;
}

/**
 * Fetch a walking recovery route from origin (current off-route position)
 * to reconnectPoint (nearest point on the recorded return corridor).
 */
export async function fetchRecoveryRoute(
  origin: Coordinate,
  reconnectPoint: Coordinate
): Promise<RouteResult | null> {
  return fetchWalkingRoute(origin, reconnectPoint);
}

/**
 * Fetch a walking route from origin to destination.
 * Returns null on any failure (no throw) so callers can fall back to offline.
 */
export async function fetchWalkingRoute(
  origin: Coordinate,
  destination: Coordinate
): Promise<RouteResult | null> {
  const coords =
    `${origin.longitude},${origin.latitude};` +
    `${destination.longitude},${destination.latitude}`;

  const url = `${BASE}/route/v1/foot/${coords}?overview=full&geometries=geojson&steps=false`;

  let controller: AbortController | null = null;
  if (typeof AbortController !== 'undefined') {
    controller = new AbortController();
    setTimeout(() => controller?.abort(), 15000);
  }

  try {
    const res = await fetch(url, { signal: controller?.signal });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json || json.code !== 'Ok' || !json.routes || json.routes.length === 0) {
      return null;
    }
    const route = json.routes[0];
    const geom = route.geometry?.coordinates;
    if (!geom || geom.length < 2) return null;

    const coordinates: Coordinate[] = geom.map(
      ([lng, lat]: [number, number]) => ({
        latitude: lat,
        longitude: lng,
        timestamp: Date.now(),
      })
    );

    return {
      coordinates,
      distanceMeters: route.distance ?? 0,
      durationSeconds: route.duration ?? 0,
    };
  } catch {
    return null;
  }
}

import { Coordinate } from '../types';
import { RoutingConfig } from '../constants/theme';

const BASE = process.env.EXPO_PUBLIC_ROUTING_BASE_URL ?? RoutingConfig.baseUrl;

export interface RouteResult {
  coordinates: Coordinate[];
  distanceMeters: number;
  durationSeconds: number;
}

export async function fetchWalkingRoute(
  origin: Coordinate,
  destination: Coordinate
): Promise<RouteResult | null> {
  const coords =
    `${origin.longitude},${origin.latitude};` +
    `${destination.longitude},${destination.latitude}`;

  const url = `${BASE}/route/v1/foot/${coords}?overview=full&geometries=geojson&steps=false`;

  try {
    const res = await fetch(url);
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

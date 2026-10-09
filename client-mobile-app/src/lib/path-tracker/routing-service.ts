import { Coordinate } from './types';

export interface RouteResult {
  coordinates: Coordinate[];
  distanceMeters: number;
  durationSeconds: number;
}

export async function fetchRecoveryRoute(
  origin: Coordinate,
  destination: Coordinate
): Promise<RouteResult | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/foot/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.routes || data.routes.length === 0) return null;

    const route = data.routes[0];
    const coords: [number, number][] = route.geometry.coordinates;
    const now = Date.now();

    return {
      coordinates: coords.map(([lng, lat]) => ({
        latitude: lat,
        longitude: lng,
        timestamp: now,
      })),
      distanceMeters: route.distance,
      durationSeconds: route.duration,
    };
  } catch {
    return null;
  }
}

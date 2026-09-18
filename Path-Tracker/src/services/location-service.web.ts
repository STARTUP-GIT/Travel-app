// Web fallback for the location service using the browser Geolocation API.
import { Coordinate } from '../types';
import { TrackingConfig } from '../constants/theme';
import { validateCoordinate, smoothHeading, haversineDistance } from '../utils/geo';

export type LocationFix = Coordinate;
export type LocationCallback = (fix: LocationFix) => void;

let lastFix: Coordinate | null = null;

export async function ensurePermissions(): Promise<boolean> {
  return !!navigator.geolocation;
}

export async function hasPermissions(): Promise<boolean> {
  return !!navigator.geolocation;
}

export async function requestBackgroundPermission(): Promise<boolean> {
  return false;
}

function toFix(pos: GeolocationPosition): Coordinate {
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    altitude: pos.coords.altitude ?? undefined,
    accuracy: pos.coords.accuracy ?? undefined,
    heading: pos.coords.heading ?? undefined,
    speed: pos.coords.speed ?? undefined,
    timestamp: pos.timestamp,
  };
}

export function filterFix(fix: Coordinate, prev: Coordinate | null): Coordinate | null {
  if (!validateCoordinate(fix)) return null;
  if (fix.accuracy !== undefined && fix.accuracy > TrackingConfig.minAccuracyMeters) {
    return null;
  }
  if (prev) {
    const dist = haversineDistance(prev, fix);
    const dt = (fix.timestamp - prev.timestamp) / 1000;
    if (dist > TrackingConfig.maxJumpMeters) return null;
    if (dt > 0 && dist / dt > TrackingConfig.maxPlausibleSpeedMs) return null;
  }
  return fix;
}

export function startGPSStream(callback: LocationCallback): () => void {
  let id: number | null = null;
  let prev: Coordinate | null = null;

  if (!navigator.geolocation) return () => {};

  id = navigator.geolocation.watchPosition(
    (pos) => {
      const fix = toFix(pos);
      const filtered = filterFix(fix, prev);
      if (!filtered) return;
      prev = filtered;
      lastFix = filtered;
      callback(filtered);
    },
    () => {},
    {
      enableHighAccuracy: true,
      maximumAge: 3000,
      timeout: 10000,
    }
  );

  return () => {
    if (id !== null) navigator.geolocation.clearWatch(id);
  };
}

export function startBackgroundLocationTask(_task: string): void {}

export async function stopBackgroundLocationTask(_task: string): Promise<void> {}

export async function getCurrentLocation(): Promise<Coordinate | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const fix = toFix(pos);
        if (!filterFix(fix, null)) {
          resolve(null);
          return;
        }
        lastFix = fix;
        resolve(fix);
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

export function getLastFix(): Coordinate | null {
  return lastFix;
}

export function startHeadingStream(callback: (heading: number) => void): () => void {
  let handler: ((e: DeviceOrientationEvent) => void) | null = null;
  const BUFFER: number[] = [];
  let last = 0;

  const onOrientation = (event: DeviceOrientationEvent) => {
    const now = Date.now();
    if (now - last < 100) return;
    last = now;
    if (event.alpha === null) return;
    let heading = (360 - event.alpha) % 360;
    BUFFER.push(heading);
    if (BUFFER.length > 6) BUFFER.shift();
    callback(smoothHeading(BUFFER));
  };

  const start = () => {
    window.addEventListener('deviceorientation', onOrientation);
    handler = onOrientation;
  };

  if (typeof DeviceOrientationEvent !== 'undefined') {
    const DEI = DeviceOrientationEvent as any;
    if (typeof DEI.requestPermission === 'function') {
      DEI.requestPermission()
        .then((state: string) => {
          if (state === 'granted') start();
        })
        .catch(() => {});
    } else {
      start();
    }
  }

  return () => {
    if (handler) {
      window.removeEventListener('deviceorientation', handler);
      handler = null;
    }
    BUFFER.length = 0;
  };
}

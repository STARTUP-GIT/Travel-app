import * as Location from 'expo-location';
import { Coordinate } from '../types';
import { TrackingConfig, Branding } from '../constants/theme';
import { validateCoordinate, haversineDistance, smoothHeading } from '../utils/geo';

/**
 * GPS / location service. This is the lowest layer feeding the tracking engine.
 * It never decides trip logic - it only produces validated GPS fixes.
 */

export type LocationFix = Coordinate;

export type LocationCallback = (fix: LocationFix) => void;

let lastFix: Coordinate | null = null;

export async function ensurePermissions(): Promise<boolean> {
  const { status: fg } = await Location.getForegroundPermissionsAsync();
  if (fg === 'granted') return true;
  const { status: requested } = await Location.requestForegroundPermissionsAsync();
  if (requested === 'granted') return true;
  return false;
}

export async function hasPermissions(): Promise<boolean> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status === 'granted';
}

export async function requestBackgroundPermission(): Promise<boolean> {
  try {
    const { status } = await Location.requestBackgroundPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

function toFix(loc: Location.LocationObject): Coordinate {
  return {
    latitude: loc.coords.latitude,
    longitude: loc.coords.longitude,
    altitude: loc.coords.altitude ?? undefined,
    accuracy: loc.coords.accuracy ?? undefined,
    heading: loc.coords.heading ?? undefined,
    speed: loc.coords.speed ?? undefined,
    timestamp: loc.timestamp,
  };
}

/**
 * Validates a GPS fix against quality filters. Returns null if the fix should
 * be discarded. This protects the tracking engine from noise but never filters
 * out legitimate slow movement.
 */
export function filterFix(fix: Coordinate, prev: Coordinate | null): Coordinate | null {
  if (!validateCoordinate(fix)) return null;
  // Accuracy gate
  if (fix.accuracy !== undefined && fix.accuracy > TrackingConfig.minAccuracyMeters) {
    return null;
  }
  // Impossible speed / jump
  if (prev) {
    const dist = haversineDistance(prev, fix);
    const dt = (fix.timestamp - prev.timestamp) / 1000;
    if (dist > TrackingConfig.maxJumpMeters) return null;
    if (dt > 0 && dist / dt > TrackingConfig.maxPlausibleSpeedMs) return null;
  }
  return fix;
}

/** Start a live GPS stream. Returns an unsubscribe function. */
export function startGPSStream(callback: LocationCallback): () => void {
  let sub: Location.LocationSubscription | null = null;
  let prev: Coordinate | null = null;

  const promise = Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      distanceInterval: TrackingConfig.distanceFilterMeters,
      timeInterval: TrackingConfig.timeIntervalMs,
    },
    (loc) => {
      const fix = toFix(loc);
      const filtered = filterFix(fix, prev);
      if (!filtered) return;
      prev = filtered;
      lastFix = filtered;
      callback(filtered);
    }
  );

  promise.then((s) => {
    sub = s;
  });

  return () => {
    sub?.remove?.();
    promise.then((s) => s.remove()).catch(() => {});
  };
}

export function startBackgroundLocationTask(taskName: string): void {
  Location.startLocationUpdatesAsync(taskName, {
    accuracy: Location.Accuracy.High,
    distanceInterval: TrackingConfig.distanceFilterMeters,
    timeInterval: TrackingConfig.timeIntervalMs,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: Branding.appName,
      notificationBody: Branding.androidNotificationBody,
      notificationColor: '#208AEF',
    },
    pausesUpdatesAutomatically: false,
  }).catch(() => {});
}

export async function stopBackgroundLocationTask(taskName: string): Promise<void> {
  try {
    const running = await Location.hasStartedLocationUpdatesAsync(taskName);
    if (running) {
      await Location.stopLocationUpdatesAsync(taskName);
    }
  } catch {
    // ignore
  }
}

/** Resolve after `ms`, used so a fix request can never hang the UI. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      }
    );
  });
}

export async function getCurrentLocation(): Promise<Coordinate | null> {
  try {
    const loc = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      4000
    );
    if (!loc) return null;
    const fix = toFix(loc);
    if (!filterFix(fix, null)) return null;
    lastFix = fix;
    return fix;
  } catch {
    return null;
  }
}

export function getLastFix(): Coordinate | null {
  return lastFix;
}


/** Heading stream (device compass). Returns unsubscribe. */
export function startHeadingStream(
  callback: (heading: number) => void
): () => void {
  let sub: Location.LocationSubscription | null = null;
  let last = 0;
  const BUFFER: number[] = [];

  const promise = Location.watchHeadingAsync((h) => {
    const now = Date.now();
    if (now - last < 100) return;
    last = now;
    let heading = h.trueHeading ?? h.magHeading;
    if (heading < 0) heading = 0;
    BUFFER.push(heading);
    if (BUFFER.length > 6) BUFFER.shift();
    callback(smoothHeading(BUFFER));
  });

  promise.then((s) => {
    sub = s;
  });

  return () => {
    sub?.remove?.();
    promise.then((s) => s.remove()).catch(() => {});
  };
}

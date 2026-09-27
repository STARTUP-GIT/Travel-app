// Web fallback for the location service using the browser Geolocation API.
import { Coordinate } from '../types';
import { TrackingConfig } from '../constants/theme';
import { validateCoordinate, smoothHeading, haversineDistance } from '../utils/geo';

export type LocationFix = Coordinate;
export type LocationCallback = (fix: LocationFix) => void;

/** Non-standard iOS Safari orientation permission API. */
interface DeviceOrientationPermissionApi {
  requestPermission?: () => Promise<string>;
}

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

/**
 * Start the location watcher.
 *
 * `onError` is an optional, additive platform-boundary hook: the original
 * signature is unchanged and the default behaviour is identical (errors are
 * ignored). It exists so the UI can report a lost GPS signal during a trip
 * instead of silently freezing on stale coordinates. It never alters which
 * fixes are accepted, how distance is computed, or when the trip ends.
 */
export function startGPSStream(
  callback: LocationCallback,
  onError?: (error: GeoFailure) => void
): () => void {
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
    (error) => {
      onError?.(mapPositionError(error));
    },
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
    // Platform boundary: iOS Safari exposes a non-standard static
    // `requestPermission` on DeviceOrientationEvent. The original cast the
    // constructor; here it is described with a narrow local interface so the
    // same runtime check and the same 100 ms smoothing buffer are preserved
    // without an unchecked cast.
    const dei = DeviceOrientationEvent as unknown as DeviceOrientationPermissionApi;
    if (typeof dei.requestPermission === 'function') {
      dei.requestPermission()
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

// ─────────────────────────────────────────────────────────────────────────────
// Platform boundary: observable geolocation status
//
// The original web service collapses every failure into `resolve(null)` and
// drops the GeolocationPositionError, so the UI has no way to distinguish
// "permission denied" from "no GPS hardware" from "timed out" — and therefore
// no terminating state. These helpers expose the same acquisition with the same
// options and the same accuracy filter, but report WHY it failed. No tracking
// calculation is involved.
// ─────────────────────────────────────────────────────────────────────────────

export type GeoPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

export type GeoErrorKind =
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'UNSUPPORTED';

export interface GeoFailure {
  kind: GeoErrorKind;
  message: string;
}

export type GeoAcquisition =
  | { ok: true; fix: Coordinate }
  | { ok: false; error: GeoFailure };

function mapPositionError(error: GeolocationPositionError): GeoFailure {
  switch (error.code) {
    case error.PERMISSION_DENIED:
    case 1:
      return {
        kind: 'PERMISSION_DENIED',
        message: 'Location permission was denied for this site.',
      };
    case error.TIMEOUT:
    case 3:
      return {
        kind: 'TIMEOUT',
        message: 'Timed out waiting for a GPS position.',
      };
    case error.POSITION_UNAVAILABLE:
    case 2:
    default:
      return {
        kind: 'POSITION_UNAVAILABLE',
        message: error.message || 'Your device could not determine a position.',
      };
  }
}

/** True when the runtime exposes the browser Geolocation API at all. */
export function isGeolocationSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.geolocation;
}

/**
 * Real permission state via the Permissions API.
 *
 * The original `hasPermissions()` only checks `!!navigator.geolocation`, which
 * is true even when the user has blocked location, so it cannot be used to
 * decide whether to show the tracker. Falls back to the original check when the
 * Permissions API is unavailable (older Safari / insecure contexts).
 */
export async function queryGeolocationPermission(): Promise<GeoPermissionState> {
  if (!isGeolocationSupported()) return 'unsupported';
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
    return (await hasPermissions()) ? 'prompt' : 'unsupported';
  }
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    if (status.state === 'granted') return 'granted';
    if (status.state === 'denied') return 'denied';
    return 'prompt';
  } catch {
    return (await hasPermissions()) ? 'prompt' : 'unsupported';
  }
}

/**
 * One-shot position acquisition with a reported outcome.
 *
 * Uses exactly the original options (`enableHighAccuracy: true`,
 * `timeout: 10000`) and exactly the original `filterFix(fix, null)` accuracy
 * rule, so the accepted fix is identical to what `getCurrentLocation()` would
 * return. The only difference is that a failure is classified instead of being
 * swallowed, and an over-accurate rejected fix is reported as unavailable
 * rather than silently becoming `null`.
 */
export function getCurrentLocationDetailed(): Promise<GeoAcquisition> {
  return new Promise<GeoAcquisition>((resolve) => {
    if (!isGeolocationSupported()) {
      resolve({
        ok: false,
        error: {
          kind: 'UNSUPPORTED',
          message: 'This browser does not provide location services.',
        },
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const fix = toFix(pos);
        // Same accuracy gate as the original.
        if (!filterFix(fix, null)) {
          resolve({
            ok: false,
            error: {
              kind: 'POSITION_UNAVAILABLE',
              message: `Received a position with ${Math.round(fix.accuracy ?? 999)} m accuracy, which is too poor to track.`,
            },
          });
          return;
        }
        lastFix = fix;
        resolve({ ok: true, fix });
      },
      (error) => {
        const mapped = mapPositionError(error);
        resolve({ ok: false, error: mapped });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

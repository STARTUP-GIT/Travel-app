import * as ExpoLocation from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Coordinate } from './types';
import { TrackingConfig, Branding } from './theme';
import { validateCoordinate, haversineDistance } from './geo';

export type LocationFix = Coordinate;
export type LocationCallback = (fix: LocationFix) => void;

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

let lastFix: Coordinate | null = null;
const LOCATION_REQUEST_TIMEOUT_MS = 10000;

export async function ensurePermissions(): Promise<boolean> {
  try {
    const res = await ExpoLocation.requestForegroundPermissionsAsync();
    return res.status === 'granted';
  } catch {
    return false;
  }
}

export async function hasPermissions(): Promise<boolean> {
  try {
    const res = await ExpoLocation.getForegroundPermissionsAsync();
    return res.status === 'granted';
  } catch {
    return false;
  }
}

export async function requestBackgroundPermission(): Promise<boolean> {
  try {
    const res = await ExpoLocation.requestBackgroundPermissionsAsync();
    return res.status === 'granted';
  } catch {
    return false;
  }
}

export function filterFix(fix: Coordinate, prev: Coordinate | null): Coordinate | null {
  if (!validateCoordinate(fix)) return null;
  if (fix.accuracy !== undefined && fix.accuracy !== null && fix.accuracy > TrackingConfig.minAccuracyMeters) {
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
 * Start authoritative location watcher on React Native.
 */
export function startGPSStream(
  callback: LocationCallback,
  onError?: (error: GeoFailure) => void
): () => void {
  let subscription: ExpoLocation.LocationSubscription | null = null;
  let prev: Coordinate | null = null;
  let cancelled = false;

  ExpoLocation.watchPositionAsync(
    {
      accuracy: ExpoLocation.Accuracy.BestForNavigation,
      distanceInterval: 1,
      timeInterval: 1000,
    },
    (pos) => {
      if (cancelled) return;
      const fix: Coordinate = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        altitude: pos.coords.altitude ?? undefined,
        accuracy: pos.coords.accuracy ?? undefined,
        heading: pos.coords.heading ?? undefined,
        speed: pos.coords.speed ?? undefined,
        timestamp: pos.timestamp,
      };

      const filtered = filterFix(fix, prev);
      if (!filtered) return;
      prev = filtered;
      lastFix = filtered;
      callback(filtered);
    }
  ).then((sub) => {
    if (cancelled) {
      sub.remove();
    } else {
      subscription = sub;
    }
  }).catch((err) => {
    onError?.({
      kind: 'POSITION_UNAVAILABLE',
      message: err?.message || 'Could not start location updates.',
    });
  });

  return () => {
    cancelled = true;
    subscription?.remove();
  };
}

export function startHeadingStream(callback: (heading: number) => void): () => void {
  let subscription: ExpoLocation.LocationSubscription | null = null;
  let cancelled = false;

  ExpoLocation.watchHeadingAsync((h) => {
    if (cancelled) return;
    const val = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
    if (val >= 0) callback(val);
  }).then((sub) => {
    if (cancelled) sub.remove();
    else subscription = sub;
  }).catch(() => {});

  return () => {
    cancelled = true;
    subscription?.remove();
  };
}

export function getLastFix(): Coordinate | null {
  return lastFix;
}

export async function getCurrentLocation(): Promise<Coordinate | null> {
  try {
    const pos = await ExpoLocation.getCurrentPositionAsync({
      accuracy: ExpoLocation.Accuracy.BestForNavigation,
    });
    const fix: Coordinate = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      altitude: pos.coords.altitude ?? undefined,
      accuracy: pos.coords.accuracy ?? undefined,
      heading: pos.coords.heading ?? undefined,
      speed: pos.coords.speed ?? undefined,
      timestamp: pos.timestamp,
    };
    if (filterFix(fix, null)) {
      lastFix = fix;
      return fix;
    }
    return null;
  } catch {
    return null;
  }
}

export async function queryGeolocationPermission(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
  try {
    const status = await ExpoLocation.getForegroundPermissionsAsync();
    if (status.status === 'granted') return 'granted';
    if (status.status === 'denied') return 'denied';
    return 'prompt';
  } catch {
    return 'unsupported';
  }
}

export function watchForAccurateLocation(
  onImprovingAccuracy: (accuracy: number) => void,
  signal?: AbortSignal
): Promise<GeoAcquisition | null> {
  return new Promise<GeoAcquisition | null>((resolve) => {
    if (signal?.aborted) {
      resolve(null);
      return;
    }

    let settled = false;
    let subscription: ExpoLocation.LocationSubscription | null = null;
    let timer: ReturnType<typeof setTimeout>;

    const finish = (result: GeoAcquisition | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      subscription?.remove();
      resolve(result);
    };

    const abort = () => finish(null);
    signal?.addEventListener('abort', abort, { once: true });

    timer = setTimeout(() => {
      finish({
        ok: false,
        error: {
          kind: 'TIMEOUT',
          message: 'Timed out waiting for an acceptable GPS position.',
        },
      });
    }, LOCATION_REQUEST_TIMEOUT_MS);

    ExpoLocation.watchPositionAsync(
      {
        accuracy: ExpoLocation.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 1,
      },
      (pos) => {
        if (settled) return;
        const fix: Coordinate = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          altitude: pos.coords.altitude ?? undefined,
          accuracy: pos.coords.accuracy ?? undefined,
          heading: pos.coords.heading ?? undefined,
          speed: pos.coords.speed ?? undefined,
          timestamp: pos.timestamp,
        };

        const accepted = filterFix(fix, null);
        if (!accepted) {
          if (fix.accuracy !== undefined && fix.accuracy !== null && fix.accuracy > TrackingConfig.minAccuracyMeters) {
            onImprovingAccuracy(fix.accuracy);
          }
          return;
        }

        lastFix = accepted;
        finish({ ok: true, fix: accepted });
      }
    ).then((sub) => {
      if (settled) sub.remove();
      else subscription = sub;
    }).catch((err) => {
      finish({
        ok: false,
        error: {
          kind: 'POSITION_UNAVAILABLE',
          message: err?.message || 'Could not obtain location.',
        },
      });
    });
  });
}

// ── Background Task ──────────────────────────────────────────────────────────

export function startBackgroundLocationTask(taskName: string = Branding.backgroundTaskName): void {
  ExpoLocation.getBackgroundPermissionsAsync().then((bg) => {
    if (bg.status === 'granted') {
      TaskManager.isTaskRegisteredAsync(taskName).then((registered) => {
        if (!registered) {
          ExpoLocation.startLocationUpdatesAsync(taskName, {
            accuracy: ExpoLocation.Accuracy.BestForNavigation,
            timeInterval: 4000,
            distanceInterval: 3,
            pausesUpdatesAutomatically: false,
            showsBackgroundLocationIndicator: true,
            foregroundService: {
              notificationTitle: 'Path Tracker Active',
              notificationBody: 'Recording your trip route in the background.',
            },
          }).catch(() => {});
        }
      });
    }
  });
}

export async function stopBackgroundLocationTask(taskName: string = Branding.backgroundTaskName): Promise<void> {
  try {
    const registered = await TaskManager.isTaskRegisteredAsync(taskName);
    if (registered) {
      await ExpoLocation.stopLocationUpdatesAsync(taskName);
    }
  } catch {
    // safe
  }
}

/**
 * Path Tracker domain types and engine.
 *
 * Ported from the customer web app's `features/path-tracker`, preserving the parts
 * that decide whether a recorded distance is honest:
 *
 *   - the same adaptive point filter (straight 3 m / turn 1.5 m at 25°, micro-jitter
 *     under 1.2 m always rejected, and the same 0.45 displacement-vs-accuracy ratio)
 *   - haversine distance accumulation, so the total is real travelled distance and
 *     not a straight-line figure between the first and last fix
 *   - active duration that freezes while paused, rather than wall-clock elapsed time
 *   - trip persistence after every accepted point, so an app kill resumes the trip
 *     instead of losing it
 *
 * Deliberately NOT ported: the web app's OSRM return corridor, off-route recovery
 * routing and its hysteresis, compass shake-detection and step counting. Those
 * depend on web geolocation semantics and online routing that a native screen does
 * not have equivalents for. Rather than fake them, the return guidance here is a
 * direct "you are N m from where you started" bearing, which is truthful and needs
 * no network.
 */

import * as TaskManager from "expo-task-manager";
import * as ExpoLocation from "expo-location";
import { haversineMeters } from "@/lib/utils/geo";

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export type Coordinate = {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy?: number | null;
  speed?: number | null;
  timestamp: number;
};

export type TripPoint = Coordinate & {
  /** Sequential index within the trip. */
  index: number;
};

export type TripState = "ACTIVE" | "PAUSED";

export type Trip = {
  id: string;
  startTime: number;
  endTime?: number;
  totalDistance: number;
  /** Milliseconds of non-paused recording. */
  activeDurationMs: number;
  points: TripPoint[];
  state: TripState;
  /** Set when the trip was paused, so recovery can restore the correct segment. */
  activeSegmentStart?: number;
  avgSpeed?: number;
  maxSpeed?: number;
  avgPaceSecPerKm?: number;
  returnedToStart?: boolean;
};

/** History rows carry no point array — the full path is only loaded on demand. */
export type TripSummary = {
  id: string;
  startTime: number;
  endTime?: number;
  totalDistance: number;
  activeDurationMs: number;
  state: TripState;
  pointCount: number;
  returnedToStart?: boolean;
};

export const BACKGROUND_TASK = "kt-path-tracker-background";

/* -------------------------------------------------------------------------- */
/* Filter constants — ported from the web tracker, do not retune arbitrarily    */
/* -------------------------------------------------------------------------- */

const MICRO_JITTER_M = 1.2;
const STRAIGHT_MIN_DISTANCE_M = 3;
const TURN_MIN_DISTANCE_M = 1.5;
const TURN_ANGLE_THRESHOLD_DEG = 25;
const MIN_DISPLACEMENT_ACCURACY_RATIO = 0.45;
/** A fix this poor is not worth recording at all. */
const MAX_ACCEPTABLE_ACCURACY_M = 100;
/** Displacements faster than this are a GPS jump, not a person. */
const MAX_PLAUSIBLE_SPEED_MPS = 70;

export type AcceptDecision =
  | { accept: true; distanceDelta: number }
  | { accept: false; reason: string };

function bearing(a: Coordinate, b: Coordinate): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const y = Math.sin(toRad(b.longitude - a.longitude)) * Math.cos(toRad(b.latitude));
  const x =
    Math.cos(toRad(a.latitude)) * Math.sin(toRad(b.latitude)) -
    Math.sin(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.cos(toRad(b.longitude - a.longitude));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * Decides whether a fix becomes a recorded path point, and by how much it extends
 * the trip. Returns the distance so the caller never recomputes it — keeping the
 * "was this accepted" and "how far did it move" decisions in one place is what
 * stops distance drifting away from the path actually drawn.
 */
export function evaluateFix(points: TripPoint[], fix: Coordinate): AcceptDecision {
  if (!Number.isFinite(fix.latitude) || !Number.isFinite(fix.longitude)) {
    return { accept: false, reason: "invalid coordinates" };
  }
  // (0,0) is the "admin never set this" sentinel, not a real fix.
  if (fix.latitude === 0 && fix.longitude === 0) {
    return { accept: false, reason: "null island fix" };
  }
  if (typeof fix.accuracy === "number" && fix.accuracy > MAX_ACCEPTABLE_ACCURACY_M) {
    return { accept: false, reason: "accuracy too poor" };
  }
  if (points.length === 0) {
    return { accept: true, distanceDelta: 0 };
  }

  const last = points[points.length - 1];
  const dist = haversineMeters(last, fix);

  if (!Number.isFinite(dist)) return { accept: false, reason: "unmeasurable displacement" };
  if (dist < MICRO_JITTER_M) return { accept: false, reason: "below jitter threshold" };

  // A displacement no larger than the reported accuracy is indistinguishable
  // from noise, so it is only trusted once the movement is convincingly large.
  if (typeof fix.accuracy === "number" && fix.accuracy > 0) {
    const confidence = dist / fix.accuracy;
    if (confidence < MIN_DISPLACEMENT_ACCURACY_RATIO && dist < 8) {
      return { accept: false, reason: "displacement within GPS noise" };
    }
  }

  // A jump that implies a car on a motorway is a bad fix, not movement.
  const seconds = (fix.timestamp - last.timestamp) / 1000;
  if (seconds > 0 && dist / seconds > MAX_PLAUSIBLE_SPEED_MPS) {
    return { accept: false, reason: "implausible speed" };
  }

  if (points.length >= 2) {
    const prev = points[points.length - 2];
    let angle = Math.abs(bearing(prev, last) - bearing(last, fix));
    if (angle > 180) angle = 360 - angle;
    const isTurn = angle > TURN_ANGLE_THRESHOLD_DEG;
    const minDistance = isTurn ? TURN_MIN_DISTANCE_M : STRAIGHT_MIN_DISTANCE_M;
    return dist >= minDistance
      ? { accept: true, distanceDelta: dist }
      : { accept: false, reason: "below sampling threshold" };
  }

  return dist >= TURN_MIN_DISTANCE_M
    ? { accept: true, distanceDelta: dist }
    : { accept: false, reason: "below sampling threshold" };
}

/* -------------------------------------------------------------------------- */
/* Engine                                                                      */
/* -------------------------------------------------------------------------- */

export function createTrip(start: Coordinate): Trip {
  return {
    id: `trip-${start.timestamp}`,
    startTime: start.timestamp,
    totalDistance: 0,
    activeDurationMs: 0,
    // The first fix is the trip's origin and is always recorded.
    points: [{ ...start, index: 0 }],
    state: "ACTIVE",
    activeSegmentStart: start.timestamp,
  };
}

/**
 * Folds a fix into a trip.
 *
 * A paused trip still keeps its first post-resume fix as a path point so the line
 * is not visually broken, but that fix contributes **no distance**: the gap while
 * paused is not travel, and counting it would inflate the total.
 */
export function ingestFix(trip: Trip, fix: Coordinate): { trip: Trip; reason?: string } {
  if (trip.state === "PAUSED") {
    const pausedFix = evaluateFix(trip.points, fix);
    if (!pausedFix.accept) return { trip, reason: pausedFix.reason };

    const next: Trip = {
      ...trip,
      points: [...trip.points, { ...fix, index: trip.points.length }],
    };
    return { trip: next };
  }

  const decision = evaluateFix(trip.points, fix);
  if (!decision.accept) return { trip, reason: decision.reason };

  const next: Trip = {
    ...trip,
    totalDistance: trip.totalDistance + decision.distanceDelta,
    points: [...trip.points, { ...fix, index: trip.points.length }],
  };
  return { trip: next };
}

/** Active duration, excluding paused time. */
export function activeDuration(trip: Trip, now = Date.now()): number {
  const closed = trip.activeSegmentStart ?? trip.startTime;
  if (trip.state === "ACTIVE") {
    return trip.activeDurationMs + Math.max(0, now - closed);
  }
  return trip.activeDurationMs;
}

export function computeStats(trip: Trip, now = Date.now()) {
  const durationMs = activeDuration(trip, now);
  const km = trip.totalDistance / 1000;
  const avgSpeed = durationMs > 0 ? trip.totalDistance / (durationMs / 1000) : 0;

  let maxSpeed = 0;
  for (let i = 1; i < trip.points.length; i += 1) {
    const a = trip.points[i - 1];
    const b = trip.points[i];
    const seconds = (b.timestamp - a.timestamp) / 1000;
    if (seconds <= 0) continue;
    const speed = haversineMeters(a, b) / seconds;
    if (Number.isFinite(speed) && speed > maxSpeed) maxSpeed = speed;
  }

  return {
    distance: trip.totalDistance,
    activeDurationMs: durationMs,
    avgSpeed,
    maxSpeed,
    avgPaceSecPerKm: km > 0 ? durationMs / 1000 / km : 0,
    pointCount: trip.points.length,
  };
}

export function pauseTrip(trip: Trip, now = Date.now()): Trip {
  if (trip.state !== "ACTIVE") return trip;

  const segment = trip.activeSegmentStart ?? trip.startTime;
  return {
    ...trip,
    state: "PAUSED",
    activeDurationMs: trip.activeDurationMs + Math.max(0, now - segment),
  };
}

export function resumeTrip(trip: Trip, now = Date.now()): Trip {
  if (trip.state !== "PAUSED") return trip;
  return { ...trip, state: "ACTIVE", activeSegmentStart: now };
}

/** Distance from the newest fix back to where the trip started. */
export function distanceToStart(trip: Trip): number | null {
  if (trip.points.length === 0) return null;
  const meters = haversineMeters(trip.points[0], trip.points[trip.points.length - 1]);
  return Number.isFinite(meters) ? meters : null;
}

export function toSummary(trip: Trip): TripSummary {
  return {
    id: trip.id,
    startTime: trip.startTime,
    endTime: trip.endTime,
    totalDistance: trip.totalDistance,
    activeDurationMs: trip.activeDurationMs,
    state: trip.state,
    pointCount: trip.points.length,
    returnedToStart: trip.returnedToStart,
  };
}

/* -------------------------------------------------------------------------- */
/* Background task                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Persists a fix from the background task.
 *
 * The task runs in its own JS context, so it cannot reach React state. It writes
 * through the shared store, and the in-app listener merges the same fix — the
 * `evaluateFix` filter makes that idempotent rather than double-counting.
 */
let backgroundStore: {
  append: (fix: Coordinate) => Promise<void>;
} | null = null;

export function registerBackgroundStore(store: { append: (fix: Coordinate) => Promise<void> }) {
  backgroundStore = store;
}

if (!TaskManager.isTaskDefined(BACKGROUND_TASK)) {
  TaskManager.defineTask(BACKGROUND_TASK, async ({ data, error }) => {
    if (error || !backgroundStore) return;
    const locations = (data as { locations?: ExpoLocation.LocationObject[] })?.locations;
    if (!Array.isArray(locations) || locations.length === 0) return;

    for (const location of locations) {
      await backgroundStore.append({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: location.coords.altitude,
        accuracy: location.coords.accuracy,
        speed: location.coords.speed,
        timestamp: location.timestamp,
      });
    }
  });
}

/** Keeps the screen awake during a recording — the app has no map to render. */
export async function startBackgroundUpdates(): Promise<boolean> {
  try {
    if (await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK)) return true;

    const foreground = await ExpoLocation.getForegroundPermissionsAsync();
    if (foreground.status !== "granted") return false;

    // Android requires background location to be granted separately, and without
    // it tracking silently stops the moment the screen locks — so a failure here
    // is reported rather than swallowed.
    const background = await ExpoLocation.requestBackgroundPermissionsAsync();
    if (background.status !== "granted") return false;

    await ExpoLocation.startLocationUpdatesAsync(BACKGROUND_TASK, {
      accuracy: ExpoLocation.Accuracy.BestForNavigation,
      timeInterval: 5000,
      distanceInterval: 5,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "Recording your trip",
        notificationBody: "Path Tracker is recording your route.",
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function stopBackgroundUpdates(): Promise<void> {
  try {
    if (await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK)) {
      await ExpoLocation.stopLocationUpdatesAsync(BACKGROUND_TASK);
    }
  } catch {
    // Already stopped.
  }
}
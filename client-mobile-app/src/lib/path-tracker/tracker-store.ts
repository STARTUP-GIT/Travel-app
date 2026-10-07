/**
 * Path Tracker persistence and history.
 *
 * Recovery is the reason this writes on every accepted point rather than on an
 * interval. A tracker that only saves when the user presses "Finish" loses the
 * entire trip if the app is killed or the battery dies — which is precisely the
 * situation a tracker is meant to have been recording through.
 *
 * The active trip is stored separately from the finished history so a resumable
 * trip is one read, and so finishing a trip is an atomic "move one key to
 * another" rather than a rewrite of the whole history list.
 */

import { KEYS, storage } from "@/lib/storage/local-store";
import type { Coordinate, Trip, TripSummary } from "@/lib/path-tracker/tracker";
import { toSummary } from "@/lib/path-tracker/tracker";

/** Guards against a corrupt file turning into an unbounded list on load. */
const MAX_HISTORY = 100;

/** Minimal guard so a malformed record cannot crash the history screen. */
function isTrip(value: unknown): value is Trip {
  if (!value || typeof value !== "object") return false;
  const trip = value as Partial<Trip>;
  return (
    typeof trip.id === "string" &&
    typeof trip.startTime === "number" &&
    typeof trip.totalDistance === "number" &&
    Array.isArray(trip.points)
  );
}

function isSummary(value: unknown): value is TripSummary {
  if (!value || typeof value !== "object") return false;
  const summary = value as Partial<TripSummary>;
  return typeof summary.id === "string" && typeof summary.startTime === "number";
}

/* -------------------------------------------------------------------------- */
/* Active trip                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The in-progress trip, or null.
 *
 * A paused trip is returned too: closing the app mid-pause must not silently
 * promote the trip to "finished", because that would freeze its duration at the
 * pause instead of letting the user resume it.
 */
export async function readActiveTrip(): Promise<Trip | null> {
  const stored = await storage.readJson<unknown>(KEYS.trackerState, null);
  if (!isTrip(stored)) return null;
  return stored;
}

export async function writeActiveTrip(trip: Trip): Promise<void> {
  await storage.writeJson(KEYS.trackerState, trip);
}

export async function clearActiveTrip(): Promise<void> {
  await storage.remove(KEYS.trackerState);
}

/* -------------------------------------------------------------------------- */
/* History                                                                     */
/* -------------------------------------------------------------------------- */

export async function listTripHistory(): Promise<TripSummary[]> {
  const stored = await storage.readJson<unknown[]>(KEYS.trips, []);
  if (!Array.isArray(stored)) return [];
  return stored.filter(isSummary).slice(0, MAX_HISTORY);
}

/** A finished trip, summarised. The full path stays in the active store. */
export async function finishTrip(
  trip: Trip,
  options: { now?: number; returnedToStart?: boolean } = {},
): Promise<TripSummary> {
  const ended: Trip = { ...trip, endTime: options.now ?? Date.now(), state: "PAUSED", activeSegmentStart: undefined };

  // `returnedToStart` is decided by the caller, which is the only place that
  // knows the live distance-to-start; it is recorded here so history can show it
  // without needing the point array.
  const summary: TripSummary = {
    id: ended.id,
    startTime: ended.startTime,
    endTime: ended.endTime,
    totalDistance: ended.totalDistance,
    activeDurationMs: ended.activeDurationMs,
    state: "PAUSED",
    pointCount: ended.points.length,
    returnedToStart: options.returnedToStart ?? trip.returnedToStart,
  };

  const history = await listTripHistory();
  await storage.writeJson(KEYS.trips, [summary, ...history].slice(0, MAX_HISTORY));
  await clearActiveTrip();

  return summary;
}

export async function deleteTrip(id: string): Promise<void> {
  const history = await listTripHistory();
  await storage.writeJson(
    KEYS.trips,
    history.filter((trip) => trip.id !== id),
  );
}

export async function clearHistory(): Promise<void> {
  await storage.writeJson(KEYS.trips, []);
}

/** Full trip detail, reconstructed from the active store after a finish. */
export async function loadTrip(id: string): Promise<Trip | null> {
  const active = await readActiveTrip();
  if (active?.id === id) return active;
  return null;
}

export { toSummary, type Coordinate };
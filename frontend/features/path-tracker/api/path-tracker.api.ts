import type { SavedTrip } from "@/features/path-tracker/types";

const STORAGE_KEY = "kt-path-trips";

/**
 * Path-trip persistence. Completed trips are stored locally on this device —
 * there is no backend trip store yet, so nothing is claimed to be synced.
 * This module is the seam where a server trip recorder can be plugged in.
 */
export function saveTrip(trip: SavedTrip): SavedTrip {
  try {
    const all = listTrips();
    all.unshift(trip);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // storage unavailable
  }
  return trip;
}

export function listTrips(): SavedTrip[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedTrip[]) : [];
  } catch {
    return [];
  }
}

export function deleteTrip(id: string): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(listTrips().filter((t) => t.id !== id))
    );
  } catch {
    // ignore
  }
}
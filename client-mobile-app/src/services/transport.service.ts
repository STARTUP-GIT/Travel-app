/**
 * Transport estimates and plans.
 *
 * There is no transport backend yet — the web frontend's transport page stores
 * plans locally and is careful never to present one as a confirmed operator
 * booking. This module keeps that honest: a plan here is a saved estimate.
 *
 * The fare table is per-kilometre reference data held in this one module so a
 * real rate feed only has to replace `estimateFare`.
 */

import { KEYS, storage } from "@/lib/storage/local-store";
import { distanceKm } from "@/lib/utils/geo";
import { formatDistance } from "@/lib/utils/format";

export type TransportMode = "auto" | "bike" | "car" | "suv";

export type TransportOption = {
  id: TransportMode;
  label: string;
  description: string;
  fareEstimate: number | null;
  seats: number;
};

export type TransportPlan = {
  id: string;
  mode: TransportMode;
  distanceMeters: number | null;
  fareEstimate: number | null;
  originLabel: string;
  destinationLabel: string;
  createdAt: string;
};

/* -------------------------------------------------------------------------- */
/* Fare estimation                                                            */
/* -------------------------------------------------------------------------- */

/** Per-kilometre reference rates (INR). Replaceable by a real rate feed. */
export const FARE_RATES_INR_PER_KM: Record<TransportMode, number> = {
  auto: 18,
  bike: 12,
  car: 22,
  suv: 28,
};

/** Minimum charge, which also acts as the floor for very short hops. */
export const BASE_FARE_INR: Record<TransportMode, number> = {
  auto: 40,
  bike: 25,
  car: 80,
  suv: 110,
};

const MODE_LABELS: Record<TransportMode, string> = {
  auto: "Auto rickshaw",
  bike: "Bike taxi",
  car: "Cab",
  suv: "SUV",
};

const MODE_DESCRIPTIONS: Record<TransportMode, string> = {
  auto: "Best for short hops and narrow roads.",
  bike: "Quickest for light luggage.",
  car: "Comfortable for up to 4 people.",
  suv: "Extra room for families or groups.",
};

const MODE_SEATS: Record<TransportMode, number> = {
  auto: 4,
  bike: 1,
  car: 4,
  suv: 6,
};

/**
 * Estimated fare in INR, or null when the distance is unknown.
 *
 * Null matters: with no distance there is nothing to estimate, and showing a
 * number anyway would be a fabricated quote.
 */
export function estimateFare(mode: TransportMode, distanceMeters: number | null): number | null {
  if (
    distanceMeters === null ||
    !Number.isFinite(distanceMeters) ||
    distanceMeters < 0
  ) {
    return null;
  }
  const km = distanceMeters / 1000;
  const base = BASE_FARE_INR[mode];
  return Math.round(Math.max(base, base + km * FARE_RATES_INR_PER_KM[mode]));
}

export function listTransportOptions(distanceMeters: number | null): TransportOption[] {
  return (Object.keys(MODE_LABELS) as TransportMode[]).map((mode) => ({
    id: mode,
    label: MODE_LABELS[mode],
    description: MODE_DESCRIPTIONS[mode],
    fareEstimate: estimateFare(mode, distanceMeters),
    seats: MODE_SEATS[mode],
  }));
}

/**
 * Straight-line distance between two coordinates.
 *
 * Named `straightLine` everywhere it is shown, because a fare built on it is an
 * estimate — real road distance would come from a routing provider.
 */
export function straightLineMeters(
  origin: { latitude: number; longitude: number } | null,
  destination: { latitude: number; longitude: number },
): number | null {
  if (!origin) return null;
  const km = distanceKm(origin, destination);
  return Number.isFinite(km) ? km * 1000 : null;
}

export function formatTransportDistance(meters: number | null): string {
  return meters === null ? "Distance unavailable" : formatDistance(meters);
}

/* -------------------------------------------------------------------------- */
/* Plan persistence                                                           */
/* -------------------------------------------------------------------------- */

export async function saveTransportPlan(
  plan: Omit<TransportPlan, "id" | "createdAt">,
): Promise<TransportPlan> {
  const createdAt = new Date().toISOString();
  const saved: TransportPlan = { ...plan, id: `${createdAt}-${plan.mode}`, createdAt };

  const all = await listTransportPlans();
  await storage.writeJson(KEYS.transportPlans, [saved, ...all]);
  return saved;
}

export async function listTransportPlans(): Promise<TransportPlan[]> {
  const all = await storage.readJson<TransportPlan[]>(KEYS.transportPlans, []);
  return Array.isArray(all) ? all : [];
}

export async function deleteTransportPlan(id: string): Promise<void> {
  const all = await listTransportPlans();
  await storage.writeJson(
    KEYS.transportPlans,
    all.filter((plan) => plan.id !== id),
  );
}
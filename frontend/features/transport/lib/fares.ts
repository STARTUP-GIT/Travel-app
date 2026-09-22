import type { TransportMode, TransportFareInput } from "@/features/transport/types";

/**
 * Fare estimation business logic. Rates are per-kilometre reference values
 * that a transport partner / backend can later supply; the module is the
 * single seam for fare calculations.
 */
export const FARE_RATES_INR_PER_KM: Record<TransportMode, number> = {
  auto: 18,
  bike: 12,
  car: 22,
  suv: 28,
};

export const BASE_FARE_INR: Record<TransportMode, number> = {
  auto: 40,
  bike: 25,
  car: 80,
  suv: 110,
};

export function estimateFare(input: TransportFareInput): number | null {
  if (
    input.distanceMeters === null ||
    input.distanceMeters === undefined ||
    !Number.isFinite(input.distanceMeters) ||
    input.distanceMeters < 0
  ) {
    return null;
  }
  const km = input.distanceMeters / 1000;
  // Scale a modest minimum charge: short hops get the base; long hops grow with distance.
  return Math.round(Math.max(baseFor(input.mode), BASE_FARE_INR[input.mode] + km * FARE_RATES_INR_PER_KM[input.mode]));
}

function baseFor(mode: TransportMode): number {
  return BASE_FARE_INR[mode];
}

export function formatDistanceMeters(meters: number | null): string {
  if (meters === null || !Number.isFinite(meters)) return "";
  if (meters < 1000) return `${Math.max(1, Math.round(meters))} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
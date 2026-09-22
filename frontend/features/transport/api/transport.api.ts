import type { TransportPlan } from "@/features/transport/types";

const STORAGE_KEY = "kt-transport-plans";

/**
 * Transport plan persistence. Plans are harmless trip estimates stored
 * locally — there is no transport booking backend yet, so nothing here is
 * presented as a confirmed operator booking.
 */
export function saveTransportPlan(plan: TransportPlan): TransportPlan {
  try {
    const all = listTransportPlans();
    all.unshift(plan);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // storage unavailable
  }
  return plan;
}

export function listTransportPlans(): TransportPlan[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TransportPlan[]) : [];
  } catch {
    return [];
  }
}

export function deleteTransportPlan(createdAt: string): void {
  try {
    const all = listTransportPlans().filter((p) => p.createdAt !== createdAt);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}
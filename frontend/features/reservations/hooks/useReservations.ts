"use client";

import { useAsync } from "@/lib/hooks/use-async";
import { listReservations } from "../api/reservations.api";

export function useReservations() {
  return useAsync(() => listReservations().catch(() => []), []);
}
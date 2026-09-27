"use client";

import { motion } from "motion/react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { useTripStore } from "../store/trip-store";
import { formatDistance } from "../utils/geo";

/**
 * Shown when the Path Tracker finds an ACTIVE / PAUSED / RETURNING trip in the
 * local database, so a recorded trip is never lost. Mirrors the original
 * Path-Tracker/src/components/RecoveryPrompt.tsx.
 */
export function RecoveryPrompt({ onContinue }: { onContinue: () => void }) {
  const recovered = useTripStore((s) => s.recoveredActive);
  const discard = useTripStore((s) => s.discardRecoveredTrip);

  if (!recovered) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Active trip recovered"
    >
      <div className="card-surface w-full max-w-md rounded-2xl p-5 text-center">
        <p className="text-[0.65rem] font-bold tracking-[0.2em] text-primary">
          ACTIVE TRIP RECOVERED
        </p>
        <p className="mt-2 text-3xl font-bold">{formatDistance(recovered.totalDistance)}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {recovered.points.length} points · started{" "}
          {new Date(recovered.startTime).toLocaleTimeString()}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => discard()}>
            Discard
          </Button>
          <Button variant="action" className="rounded-xl" onClick={onContinue}>
            Continue trip
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

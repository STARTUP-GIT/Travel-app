"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { useTripStore } from "../store/trip-store";
import { formatDistance, formatDuration, formatSpeed } from "../utils/geo";
import { triggerMediumTap, triggerTap } from "../services/alert-service";

/**
 * TRIP COMPLETE summary. Mirrors the original
 * Path-Tracker/src/components/TripCompleteModal.tsx: it is driven entirely by
 * `lastCompletedTrip` from the Path Tracker store, so every number shown is the
 * engine's own value.
 */
export function TripCompleteModal({
  districtBase,
  onTrackAgain,
}: {
  districtBase: string;
  onTrackAgain: () => void;
}) {
  const trip = useTripStore((s) => s.lastCompletedTrip);
  const clear = useTripStore((s) => s.setLastCompletedTrip);

  if (!trip) return null;

  const duration = trip.endTime ? trip.endTime - trip.startTime : trip.activeDurationMs;
  const speed = formatSpeed(trip.totalDistance, duration);
  const first = trip.points[0];
  const last = trip.points[trip.points.length - 1];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Trip complete"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card-surface w-full max-w-md rounded-2xl p-5"
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-success/12 text-success">
              <CheckCircle2 className="size-9" />
            </span>
            <h2 className="text-lg font-bold">Trip complete</h2>
            <p className="text-sm text-muted-foreground">Saved to your device</p>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <StatBlock value={formatDistance(trip.totalDistance)} label="DISTANCE" />
            <StatBlock value={formatDuration(duration)} label="DURATION" />
            <StatBlock value={speed} label="SPEED" />
          </div>

          {trip.returnedToStart ? (
            <div className="mt-3 flex items-center justify-center gap-1.5 rounded-full bg-success/12 py-1.5 text-[0.65rem] font-bold tracking-wider text-success">
              <CheckCircle2 className="size-3.5" /> RETURNED TO START
            </div>
          ) : null}

          <dl className="mt-4 space-y-2 text-sm">
            <InfoRow label="STARTED" value={new Date(trip.startTime).toLocaleString()} />
            {trip.endTime ? (
              <InfoRow label="ENDED" value={new Date(trip.endTime).toLocaleString()} />
            ) : null}
            {first ? (
              <InfoRow
                label="FROM"
                value={`${first.latitude.toFixed(5)}, ${first.longitude.toFixed(5)}`}
                dotColor="#22C55E"
              />
            ) : null}
            {last && last !== first ? (
              <InfoRow
                label="TO"
                value={`${last.latitude.toFixed(5)}, ${last.longitude.toFixed(5)}`}
              />
            ) : null}
            <InfoRow label="POINTS" value={`${trip.points.length} recorded`} />
          </dl>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                triggerTap();
                clear(null);
              }}
            >
              Back to Path Tracker
            </Button>
            <Button
              variant="action"
              className="rounded-xl"
              onClick={() => {
                triggerMediumTap();
                clear(null);
                onTrackAgain();
              }}
            >
              Track again
            </Button>
          </div>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            <Link href={`${districtBase}/path-tracker`} className="underline underline-offset-2">
              Your trips
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-muted/40 px-2 py-3">
      <p className="text-base font-bold tracking-tight text-foreground">{value}</p>
      <p className="mt-0.5 text-[0.6rem] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function InfoRow({ label, value, dotColor }: { label: string; value: string; dotColor?: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-border/60 pb-1.5 last:border-0">
      {dotColor ? (
        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
      ) : null}
      <dt className="w-16 shrink-0 text-[0.65rem] font-semibold tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 truncate text-right text-muted-foreground">{value}</dd>
    </div>
  );
}

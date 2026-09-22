"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  CheckCircle2,
  Crosshair,
  Play,
  Route,
  Satellite,
  Square,
} from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

import { ScreenHeader } from "@/components/shared/screen-header";
import { BookingSummary } from "@/components/shared/booking-summary";
import { Button } from "@/components/ui/button";
import { useGeolocation, type GeoSnapshot } from "@/lib/hooks/use-geolocation";
import { usePlace } from "@/features/places/hooks/usePlaces";
import { haversineMeters } from "@/features/maps/lib/geo";
import {
  cumulativeDistance,
  formatDistance,
  formatDuration,
  projectPoints,
  toGeoPoint,
  toTripPoint,
} from "@/features/path-tracker/lib/geometry";
import { saveTrip } from "@/features/path-tracker/api/path-tracker.api";
import type { TripDestination, TripPoint } from "@/features/path-tracker/types";
import { cn } from "@/lib/utils";

const TRACK_W = 320;
const TRACK_H = 220;

export default function LiveTrackerPage() {
  const params = useParams<{ district: string }>();
  const searchParams = useSearchParams();
  const districtSlug = params.district;
  const placeId = searchParams.get("placeId") ?? "";
  const placeName = searchParams.get("name") ?? "Destination";

  const place = usePlace(districtSlug, placeId.length ? placeId : undefined);
  const { supported, status, position, start, stop, error } = useGeolocation();

  const pointsRef = React.useRef<TripPoint[]>([]);
  const [points, setPoints] = React.useState<TripPoint[]>([]);
  const [recording, setRecording] = React.useState(false);
  const [startedAt, setStartedAt] = React.useState<string | null>(null);
  const [elapsed, setElapsed] = React.useState(0);
  const [finished, setFinished] = React.useState<{
    distanceMeters: number | null;
    duration: string;
    pointCount: number;
  } | null>(null);

  const lastPoint = points[points.length - 1] ?? null;
  const distanceToDest =
    place.data && lastPoint
      ? haversineMeters(toGeoPoint(lastPoint), place.data)
      : null;

  // Keep a live clock while recording.
  React.useEffect(() => {
    if (!recording || !startedAt) return;
    const t = setInterval(() => setElapsed(Date.now() - new Date(startedAt).getTime()), 1000);
    return () => clearInterval(t);
  }, [recording, startedAt]);

  // Watch the GPS fix and append it while recording.
  const lastPush = React.useRef<string>("");
  React.useEffect(() => {
    if (!recording || !position) return;
    const key = `${position.latitude.toFixed(6)},${position.longitude.toFixed(6)},${Math.round(position.timestamp / 1000)}`;
    if (lastPush.current === key) return;
    lastPush.current = key;
    const next = [...pointsRef.current, toTripPoint(position)];
    pointsRef.current = next;
    setPoints(next);
  }, [recording, position]);

  // Prepare the GPS watch on mount.
  React.useEffect(() => {
    if (supported && status === "idle") start();
  }, [supported, status, start]);

  function beginRecording() {
    if (!supported) {
      toast.error("This device doesn't support GPS tracking");
      return;
    }
    if (status === "error") {
      toast.error(error ?? "Location unavailable. Allow location access first.");
      start();
      return;
    }
    pointsRef.current = [];
    lastPush.current = "";
    if (position) pointsRef.current = [toTripPoint(position)];
    setPoints(pointsRef.current);
    setStartedAt(new Date().toISOString());
    setElapsed(0);
    setRecording(true);
    toast.success("Tracking started", { description: "Keep the app open — we're recording your real route." });
  }

  function endRecording() {
    setRecording(false);
    const travelled = cumulativeDistance(pointsRef.current);
    const destination: TripDestination = {
      id: place.data?.id ?? placeId,
      name: place.data?.name ?? placeName,
      districtSlug,
    };
    saveTrip({
      id: crypto.randomUUID(),
      destination,
      startedAt: startedAt ?? new Date().toISOString(),
      endedAt: new Date().toISOString(),
      distanceMeters: travelled,
      points: pointsRef.current,
      status: "completed",
    });
    setFinished({
      distanceMeters: travelled,
      duration: formatDuration(startedAt),
      pointCount: pointsRef.current.length,
    });
    stop();
    toast.success("Trip saved", { description: "Your completed route is under Path Tracker." });
  }

  return (
    <div className="pb-8">
      <ScreenHeader
        title="Path Tracker"
        subtitle={place.data?.name ?? placeName}
        backHref={`/${districtSlug}/path-tracker`}
      />

      <div className="app-container mt-2">
        {finished ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <div className="flex flex-col items-center gap-2 py-2 text-center">
              <span className="flex size-16 items-center justify-center rounded-full bg-success/12 text-success">
                <CheckCircle2 className="size-9" />
              </span>
              <h2 className="text-lg font-bold">Trip complete</h2>
              <p className="text-sm text-muted-foreground">
                Your route is saved on this device. Nothing is recorded anywhere else.
              </p>
            </div>

            <TrackSvg points={pointsRef.current} recording={false} />

            <BookingSummary
              title="Trip details"
              rows={[
                { label: "Destination", value: place.data?.name ?? placeName, strong: true },
                { label: "Distance travelled", value: formatDistance(finished.distanceMeters) || "—" },
                { label: "Duration", value: finished.duration },
                { label: "Track points", value: `${finished.pointCount}` },
              ]}
            />

            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="outline" className="rounded-xl">
                <Link href={`/${districtSlug}/path-tracker`}>Back to Path Tracker</Link>
              </Button>
              <Button variant="action" className="rounded-xl" onClick={() => setFinished(null)}>
                <Route className="size-4" /> Track again
              </Button>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {/* Status card */}
            {!recording ? (
              <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
                <span className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl",
                  supported && status !== "error" ? "bg-success/12 text-emerald-700" : "bg-amber-500/12 text-amber-700"
                )}>
                  <Satellite className="size-5" />
                </span>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-semibold">
                    {supported && status === "active" ? "GPS is ready" : supported && status === "prompt" ? "Asking for location…" : error ?? "GPS unavailable"}
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    {position
                      ? `Live fix: ${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}`
                      : "You'll see your live position here."}
                  </p>
                </div>
              </div>
            ) : null}

            {/* Route drawing */}
            <div className="card-surface relative overflow-hidden rounded-3xl p-3">
              <TrackSvg points={points} recording={recording} />
              {recording && lastPoint ? (
                <span className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-primary-foreground shadow">
                  ● Recording
                </span>
              ) : null}
            </div>

            {/* Live stats */}
            {recording ? (
              <div className="grid grid-cols-2 gap-2 text-center">
                <Stat label="Distance travelled" value={formatDistance(cumulativeDistance(points)) || "0 m"} />
                <Stat label="Time elapsed" value={formatDuration(startedAt && new Date(startedAt).toISOString())} />
              </div>
            ) : null}

            {lastPoint && !recording ? (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm">
                <span className="text-muted-foreground">Distance to {place.data?.name ?? placeName}</span>
                <span className="font-semibold text-primary">{formatDistance(distanceToDest)}</span>
              </div>
            ) : null}

            {recording ? (
              <p className="text-center text-xs text-muted-foreground">
                Accuracy:{" "}
                {lastPoint?.accuracy ? `±${Math.round(lastPoint.accuracy)} m` : "…"}
              </p>
            ) : null}

            {/* Controls */}
            {!recording ? (
              <Button variant="action" size="lg" className="w-full rounded-2xl" onClick={beginRecording}>
                <Play className="size-5" /> Start tracking
              </Button>
            ) : (
              <Button variant="destructive" size="lg" className="w-full rounded-2xl" onClick={endRecording}>
                <Square className="size-5" /> End & save trip
              </Button>
            )}

            {!recording && status === "error" ? (
              <div className="flex items-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                <AlertTriangle className="size-4 shrink-0" />
                Enable location permission in your browser to track your route.
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function TrackSvg({ points, recording }: { points: TripPoint[]; recording: boolean }) {
  const projected = projectPoints(points, TRACK_W, TRACK_H);
  const pathD =
    projected.length > 1
      ? projected.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(" ")
      : "";

  return (
    <div className="relative flex aspect-[16/10] w-full items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 via-white to-emerald-50 dark:from-blue-950/30 dark:via-transparent dark:to-emerald-950/20">
      <GridLines />
      {projected.length === 0 ? (
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Crosshair className="size-8" />
          <p className="text-xs">{recording ? "Waiting for your GPS…" : "Your route will be drawn here"}</p>
        </div>
      ) : pathD ? (
        <svg viewBox={`0 0 ${TRACK_W} ${TRACK_H}`} className="absolute inset-0 size-full" aria-hidden>
          <path
            d={pathD}
            fill="none"
            stroke="url(#trackGrad)"
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="8 6"
          />
          <defs>
            <linearGradient id="trackGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>
        </svg>
      ) : null}

      {projected.length > 0 ? (
        <>
          <motion.span
            key={projected[0].x + "-" + projected[0].y}
            className="absolute size-2.5 rounded-full bg-primary ring-4 ring-primary/20"
            style={{ left: `${(projected[0].x / TRACK_W) * 100}%`, top: `${(projected[0].y / TRACK_H) * 100}%` }}
          />
          <AnimatePresence>
            <motion.span
              key={`${last(projected).x},${last(projected).y}`}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              className="absolute size-3 rounded-full bg-success ring-4 ring-success/25"
              style={{ left: `${(last(projected).x / TRACK_W) * 100}%`, top: `${(last(projected).y / TRACK_H) * 100}%` }}
            />
          </AnimatePresence>
        </>
      ) : null}
    </div>
  );
}

function GridLines() {
  return (
    <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,theme(colors.blue.200/40)_1px,transparent_1px),linear-gradient(to_bottom,theme(colors.blue.200/40)_1px,transparent_1px)] [background-size:2rem_2rem]" aria-hidden />
  );
}

function last<T>(arr: T[]): T {
  return arr[arr.length - 1];
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-surface rounded-2xl p-4">
      <p className="text-lg font-bold tracking-tight text-primary">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
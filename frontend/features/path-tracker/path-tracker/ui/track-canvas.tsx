"use client";

import { AnimatePresence, motion } from "motion/react";
import { Crosshair } from "lucide-react";
import * as React from "react";

import type { Checkpoint, Coordinate, TripPoint } from "../types";

const TRACK_W = 320;
const TRACK_H = 220;

export type ProjectedPoint = { x: number; y: number };

/**
 * Pure presentation helper: fits a list of recorded points into the SVG
 * viewport. It performs no distance, timing or GPS maths — every value it draws
 * comes straight from the Path Tracker trip points.
 */
export function projectPoints(
  points: Pick<TripPoint, "latitude" | "longitude">[],
  width = TRACK_W,
  height = TRACK_H,
  boundsPoints: Pick<TripPoint, "latitude" | "longitude">[] = points
): ProjectedPoint[] {
  if (points.length === 0) return [];
  const refPoints = boundsPoints.length > 0 ? boundsPoints : points;
  const lats = refPoints.map((p) => p.latitude);
  const lngs = refPoints.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const dLat = maxLat - minLat || 0.0005;
  const dLng = maxLng - minLng || 0.0005;
  const latScale = height / dLat;
  const lngScale = width / dLng;

  return points.map((p) => ({
    x: +(((p.longitude - minLng) * lngScale).toFixed(2)),
    y: +((height - (p.latitude - minLat) * latScale).toFixed(2)),
  }));
}

function last<T>(arr: T[]): T {
  return arr[arr.length - 1];
}

/**
 * Renders the recorded trip path, the trip start marker and the live position.
 * Optionally overlays the same-path return corridor while RETURNING and checkpoints.
 */
export function TrackCanvas({
  points,
  currentPosition,
  returnCorridor,
  recording,
  checkpoints,
}: {
  points: TripPoint[];
  currentPosition: Coordinate | null;
  returnCorridor: Coordinate[] | null;
  recording: boolean;
  checkpoints?: Checkpoint[];
}) {
  const boundsPoints = React.useMemo(() => {
    const list: Pick<TripPoint, "latitude" | "longitude">[] = [...points];
    if (checkpoints) {
      checkpoints.forEach((cp) => list.push({ latitude: cp.latitude, longitude: cp.longitude }));
    }
    if (currentPosition) {
      list.push({ latitude: currentPosition.latitude, longitude: currentPosition.longitude });
    }
    return list;
  }, [points, checkpoints, currentPosition]);

  const projected = projectPoints(points, TRACK_W, TRACK_H, boundsPoints);
  const pathD =
    projected.length > 1
      ? projected
          .map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`))
          .join(" ")
      : "";

  const projectedCorridor = returnCorridor ? projectPoints(returnCorridor, TRACK_W, TRACK_H, boundsPoints) : [];
  const corridorD =
    projectedCorridor.length > 1
      ? projectedCorridor
          .map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`))
          .join(" ")
      : "";

  const projectedCheckpoints = React.useMemo(() => {
    if (!checkpoints || checkpoints.length === 0) return [];
    return projectPoints(
      checkpoints.map((cp) => ({ latitude: cp.latitude, longitude: cp.longitude })),
      TRACK_W,
      TRACK_H,
      boundsPoints
    );
  }, [checkpoints, boundsPoints]);

  const live = currentPosition
    ? projectPoints(
        [
          points[0] ?? { latitude: currentPosition.latitude, longitude: currentPosition.longitude },
          currentPosition,
        ],
        TRACK_W,
        TRACK_H,
        boundsPoints
      )
    : [];
  const liveMarker = live.length === 2 ? live[1] : null;

  return (
    <div className="relative flex aspect-[16/10] w-full items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 via-white to-emerald-50 dark:from-blue-950/30 dark:via-transparent dark:to-emerald-950/20">
      <GridLines />
      {projected.length === 0 ? (
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Crosshair className="size-8" />
          <p className="text-xs">
            {recording ? "Waiting for your GPS…" : "Your route will be drawn here"}
          </p>
        </div>
      ) : null}

      <svg
        viewBox={`0 0 ${TRACK_W} ${TRACK_H}`}
        className="absolute inset-0 size-full"
        aria-hidden
      >
        {corridorD ? (
          <path
            d={corridorD}
            fill="none"
            stroke="#FFB020"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 5"
          />
        ) : null}
        {pathD ? (
          <path
            d={pathD}
            fill="none"
            stroke="url(#trackGrad)"
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="8 6"
          />
        ) : null}
        <defs>
          <linearGradient id="trackGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
      </svg>

      {projectedCheckpoints.map((cp, idx) => (
        <motion.div
          key={`cp-${idx}-${cp.x}-${cp.y}`}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-purple-600 text-[10px] font-bold text-white shadow-md ring-2 ring-white"
          style={{
            left: `${(cp.x / TRACK_W) * 100}%`,
            top: `${(cp.y / TRACK_H) * 100}%`,
          }}
        >
          {checkpoints?.[idx]?.checkpointNumber ?? idx + 1}
        </motion.div>
      ))}

      {projected.length > 0 ? (
        <>
          <motion.span
            key={`${projected[0].x}-${projected[0].y}`}
            className="absolute size-2.5 rounded-full bg-primary ring-4 ring-primary/20"
            style={{
              left: `${(projected[0].x / TRACK_W) * 100}%`,
              top: `${(projected[0].y / TRACK_H) * 100}%`,
            }}
          />
          <AnimatePresence>
            {liveMarker ? (
              <motion.span
                key={`${liveMarker.x},${liveMarker.y}`}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                className="absolute size-3 rounded-full bg-success ring-4 ring-success/25"
                style={{
                  left: `${(liveMarker.x / TRACK_W) * 100}%`,
                  top: `${(liveMarker.y / TRACK_H) * 100}%`,
                }}
              />
            ) : (
              <motion.span
                key={`${last(projected).x},${last(projected).y}`}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                className="absolute size-3 rounded-full bg-success ring-4 ring-success/25"
                style={{
                  left: `${(last(projected).x / TRACK_W) * 100}%`,
                  top: `${(last(projected).y / TRACK_H) * 100}%`,
                }}
              />
            )}
          </AnimatePresence>
        </>
      ) : null}
    </div>
  );
}

function GridLines() {
  return (
    <div
      className="absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,theme(colors.blue.200/40)_1px,transparent_1px),linear-gradient(to_bottom,theme(colors.blue.200/40)_1px,transparent_1px)] [background-size:2rem_2rem]"
      aria-hidden
    />
  );
}

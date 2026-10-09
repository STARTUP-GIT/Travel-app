"use client";

import { motion } from "motion/react";
import {
  Activity,
  Check,
  Flag,
  Loader2,
  MapPinOff,
  Pause,
  Play,
  RotateCcw,
  Satellite,
  Signal,
  Square,
  Undo2,
  WifiOff,
} from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { ScreenHeader } from "@/components/shared/screen-header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { useTripSession } from "../hooks/useTripSession";
import { useTripStore } from "../store/trip-store";
import {
  formatDistance,
  formatDuration,
  formatPace,
  formatSpeed,
  haversineDistance,
} from "../utils/geo";
import type { MovementState, ReturnState } from "../types";
import {
  notifyOffRoute,
  triggerHeavyTap,
  triggerMediumTap,
  triggerTap,
  vibrateOffRoute,
} from "../services/alert-service";
import { TrackingConfig } from "../constants/theme";
import { GoogleTripMap } from "./google-trip-map";
import { RecoveryPrompt } from "./recovery-prompt";
import { TripCompleteModal } from "./trip-complete-modal";

const MOVEMENT_LABEL: Record<MovementState, string> = {
  STATIONARY: "STILL",
  MOVING: "MOVING",
  UNCERTAIN: "UNCLEAR",
};

/**
 * Live Path Tracker screen.
 *
 * This component contains presentation only. Every distance, duration, speed,
 * pace, off-route, corridor and arrival value it renders comes from the Path
 * Tracker store, which mirrors the Path Tracker trip engine. It does not
 * compute, round or derive any tracking value itself.
 */
export function LiveTracker({
  districtBase,
  placeName,
  placeCoordinate,
  googleMapsApiKey,
  onTrackAgain,
}: {
  districtBase: string;
  placeName: string;
  placeCoordinate: { latitude: number; longitude: number } | null;
  googleMapsApiKey: string;
  onTrackAgain: () => void;
}) {
  const session = useTripSession();

  const state = useTripStore((s) => s.state);
  const stats = useTripStore((s) => s.stats);
  const returnState = useTripStore((s) => s.returnState);
  const movementState = useTripStore((s) => s.movementState);
  const movementConfidence = useTripStore((s) => s.movementConfidence);
  const positionSpreadM = useTripStore((s) => s.positionSpreadM);
  const isCalibrating = useTripStore((s) => s.isCalibrating);
  const gpsAccuracy = useTripStore((s) => s.gpsAccuracy);
  const pointCount = useTripStore((s) => s.pointCount);
  const activeTrip = useTripStore((s) => s.activeTrip);
  const activeCheckpoints = useTripStore((s) => s.activeCheckpoints);
  const hasInitialPosition = useTripStore((s) => s.hasInitialPosition);
  const currentPosition = useTripStore((s) => s.currentPosition);
  const recoveredActive = useTripStore((s) => s.recoveredActive);

  const startTrip = useTripStore((s) => s.startTrip);
  const pauseTrip = useTripStore((s) => s.pauseTrip);
  const resumeTrip = useTripStore((s) => s.resumeTrip);
  const endTrip = useTripStore((s) => s.endTrip);
  const returnToStart = useTripStore((s) => s.returnToStart);
  const cancelReturn = useTripStore((s) => s.cancelReturn);
  const addCheckpoint = useTripStore((s) => s.addCheckpoint);
  const resumeRecoveredTrip = useTripStore((s) => s.resumeRecoveredTrip);
  const bootstrap = useTripStore((s) => s.bootstrap);
  const loadHistory = useTripStore((s) => s.loadHistory);

  const [confirmEnd, setConfirmEnd] = React.useState(false);
  const [busy, setBusy] = React.useState<null | "start" | "return">(null);

  React.useEffect(() => {
    void bootstrap();
    void loadHistory();
  }, [bootstrap, loadHistory]);

  const speedDisplay = React.useMemo(() => {
    if (currentPosition?.speed !== undefined && currentPosition.speed !== null && currentPosition.speed > 0) {
      return formatSpeed(currentPosition.speed);
    }
    if (stats.avgSpeed > 0) {
      return formatSpeed(stats.avgSpeed);
    }
    return "0.0 km/h";
  }, [currentPosition?.speed, stats.avgSpeed]);

  // Off-route advisory: notification + vibration, same calls the original
  // makes from its return UI. The budget/cooldown live in alert-service.
  const offRoute = returnState.offRoute === "OFF_ROUTE_CONFIRMED";
  const notifiedRef = React.useRef(false);
  React.useEffect(() => {
    if (offRoute) {
      if (!notifiedRef.current) {
        notifiedRef.current = true;
        void notifyOffRoute();
        vibrateOffRoute();
      }
    } else {
      notifiedRef.current = false;
    }
  }, [offRoute]);

  /**
   * Read-only straight-line distance from the live fix to the selected place.
   * This is display-only context for the customer UI; it is never fed into the
   * engine and never affects recorded distance, which always comes from the
   * Path Tracker trip engine.
   */
  const distanceToPlace = React.useMemo(() => {
    if (!placeCoordinate || !currentPosition) return null;
    return haversineDistance(currentPosition, {
      latitude: placeCoordinate.latitude,
      longitude: placeCoordinate.longitude,
      timestamp: currentPosition.timestamp,
    });
  }, [placeCoordinate, currentPosition]);

  if (session.permissionLoading) {
    return <StatusScreen busy message="Checking location permission…" />;
  }

  /** Acquisition states either keep watching for a better fix or offer retry. */
  switch (session.gpsPhase) {
    case "initializing":
      return (
        <StatusScreen
          busy
          title="Getting GPS"
          message="Waiting for your device to report a position. This can take a few seconds, especially indoors."
        />
      );

    case "improving":
      return (
        <StatusScreen
          busy
          title="Improving GPS accuracy..."
          message={`Current accuracy is ±${Math.round(session.improvingAccuracy ?? 0)} m. Waiting for ${TrackingConfig.minAccuracyMeters} m or better.`}
          hint="Keep this page open while your device looks for a better position."
          action={
            <Button
              variant="action"
              size="lg"
              className="rounded-xl"
              onClick={() => {
                triggerMediumTap();
                void session.retryGps();
              }}
            >
              <RotateCcw className="size-4" /> Retry GPS
            </Button>
          }
        />
      );

    case "denied":
      return (
        <StatusScreen
          icon={<MapPinOff className="size-7 text-destructive" />}
          title="Location permission denied"
          message={
            session.gpsError?.message ??
            "Path Tracker cannot record a route without your location."
          }
          hint="Allow location for this site in your browser's address-bar permissions, then retry."
          action={
            <Button
              variant="action"
              size="lg"
              className="rounded-xl"
              onClick={() => {
                triggerMediumTap();
                void session.retryGps();
              }}
            >
              <RotateCcw className="size-4" /> Retry
            </Button>
          }
        />
      );

    case "timeout":
      return (
        <StatusScreen
          icon={<Satellite className="size-7 text-warning" />}
          title="GPS timed out"
          message={session.gpsError?.message ?? "Timed out waiting for a GPS position."}
          hint="Move somewhere with a clearer view of the sky, or turn location services on, then retry."
          action={
            <Button
              variant="action"
              size="lg"
              className="rounded-xl"
              onClick={() => {
                triggerMediumTap();
                void session.retryGps();
              }}
            >
              <RotateCcw className="size-4" /> Retry
            </Button>
          }
        />
      );

    case "unavailable":
      return (
        <StatusScreen
          icon={<Satellite className="size-7 text-destructive" />}
          title="GPS unavailable"
          message={session.gpsError?.message ?? "Your device could not determine a position."}
          hint="Make sure location services are enabled on your device, then retry."
          action={
            <Button
              variant="action"
              size="lg"
              className="rounded-xl"
              onClick={() => {
                triggerMediumTap();
                void session.retryGps();
              }}
            >
              <RotateCcw className="size-4" /> Retry
            </Button>
          }
        />
      );

    case "ready":
      break;
  }

  // Defensive: a ready acquisition always carries a position. If it ever does
  // not, fall back to retry rather than rendering a permanent loader.
  if (!hasInitialPosition) {
    return (
      <StatusScreen
        icon={<Satellite className="size-7 text-warning" />}
        title="No position yet"
        message="A GPS position was reported but it was not usable for tracking."
        action={
          <Button variant="action" className="rounded-xl" onClick={() => void session.retryGps()}>
            <RotateCcw className="size-4" /> Retry
          </Button>
        }
      />
    );
  }

  const isReturning = state === "RETURNING";
  const isPaused = state === "PAUSED";
  const isActive = state === "ACTIVE";
  const isIdle = state === "IDLE";
  const arrived = returnState.arrivalState === "CONFIRMED_ARRIVAL";
  // Accuracy tiers use the original TripStatsCard thresholds.
  const accuracyTier =
    gpsAccuracy <= 12 ? "EXCELLENT" : gpsAccuracy <= 30 ? "GOOD" : gpsAccuracy <= 60 ? "FAIR" : "POOR";

  const onStart = async () => {
    triggerMediumTap();
    setBusy("start");
    try {
      // Arm the GPS stream first (no watcher exists before this point), then
      // let the original engine create the trip.
      await session.armTracking();
      await startTrip();
    } finally {
      setBusy(null);
    }
  };

  const onContinueRecovered = async () => {
    triggerMediumTap();
    setBusy("start");
    try {
      await session.armTracking();
      const trip = useTripStore.getState().recoveredActive;
      if (trip) await resumeRecoveredTrip(trip);
    } finally {
      setBusy(null);
    }
  };

  const onReturn = async () => {
    triggerMediumTap();
    setBusy("return");
    try {
      await returnToStart();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="pb-8">
      <ScreenHeader title="Path Tracker" subtitle={placeName} backHref={`${districtBase}/path-tracker`} />

      <div className="app-container mt-3 space-y-3">
      {!session.online ? (
        <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/8 px-3 py-2 text-xs text-warning-foreground">
          <WifiOff className="size-3.5 shrink-0" />
          <span>
            Offline — walking routes need internet. GPS tracking and distance recording
            continue normally.
          </span>
        </div>
      ) : null}

      {session.gpsSignalLost ? (
        <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/8 px-3 py-2 text-xs text-warning-foreground">
          <Satellite className="size-3.5 shrink-0" />
          <span>
            GPS signal lost
            {session.gpsError ? ` — ${session.gpsError.message}` : ""}. Tracking resumes
            automatically when a position returns.
          </span>
        </div>
      ) : null}

      {offRoute ? (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/8 px-3 py-2 text-xs text-destructive">
          <Signal className="size-3.5 shrink-0" />
          <span>Off route — you&apos;re away from your return path.</span>
        </div>
      ) : null}

      {arrived ? (
        <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
          <Check className="size-3.5 shrink-0" />
          <span>You&apos;re back at your start point.</span>
        </div>
      ) : null}

      {recoveredActive ? <p className="text-xs text-muted-foreground">Active trip found.</p> : null}

      <GoogleTripMap
        points={activeTrip?.points ?? []}
        currentPosition={currentPosition}
        returnCorridor={isReturning ? returnState.returnCorridor : null}
        recording={isActive}
        checkpoints={activeCheckpoints}
        apiKey={googleMapsApiKey}
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric value={formatDistance(stats.distance)} label="DISTANCE" />
        <Metric value={formatDuration(stats.activeDurationMs)} label="TIME" />
        <Metric
          value={isActive || isReturning ? formatPace(stats.avgPaceSecPerKm) : "—"}
          label="PACE"
        />
        <Metric
          value={isActive || isReturning ? speedDisplay : "0.0 km/h"}
          label="SPEED"
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.65rem] text-muted-foreground">
        <span>
          GPS <span className="font-semibold text-foreground">{accuracyTier}</span> (±
          {Math.round(gpsAccuracy)}m)
        </span>
        <span>
          POINTS <span className="font-semibold text-foreground">{pointCount}</span>
        </span>
        <span>
          CHECKPOINTS <span className="font-semibold text-foreground">{activeCheckpoints.length}</span>
        </span>
        {isActive || isReturning ? (
          <span>
            CONF{" "}
            <span className="font-semibold text-foreground">
              {Math.round(movementConfidence * 100)}%
            </span>
          </span>
        ) : null}
        {isActive || isReturning ? (
          <span>
            SPREAD{" "}
            <span className="font-semibold text-foreground">
              {positionSpreadM.toFixed(1)}m
            </span>
          </span>
        ) : null}
      </div>

      {isActive || isReturning ? (
        <p className="text-[0.65rem] text-muted-foreground">
          {isCalibrating ? "Calibrating" : MOVEMENT_LABEL[movementState] ?? "UNCLEAR"}
        </p>
      ) : null}

      {isIdle && distanceToPlace !== null ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm">
          <span className="text-muted-foreground">Distance to {placeName}</span>
          <span className="font-semibold text-primary">{formatDistance(distanceToPlace)}</span>
        </div>
      ) : null}

      {isReturning ? (
        <ReturnPanel
          returnState={returnState}
          state={state}
          onCancel={() => {
            triggerTap();
            cancelReturn();
          }}
        />
      ) : null}

      {isIdle ? (
        <Button
          variant="action"
          size="lg"
          className="w-full rounded-xl"
          onClick={() => void onStart()}
          disabled={busy === "start"}
        >
          {busy === "start" ? <Loader2 className="animate-spin" /> : <Play />}
          Start trip
        </Button>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => {
              triggerTap();
              void addCheckpoint();
            }}
          >
            <Flag /> Checkpoint
          </Button>

          {isPaused ? (
            <Button
              variant="action"
              className="rounded-xl"
              onClick={() => {
                triggerMediumTap();
                resumeTrip();
              }}
            >
              <Play /> Resume
            </Button>
          ) : (
            <Button
              variant="secondary"
              className="rounded-xl"
              onClick={() => {
                triggerMediumTap();
                pauseTrip();
              }}
            >
              <Pause /> Pause
            </Button>
          )}

          {!isReturning ? (
            <Button
              variant="secondary"
              className="rounded-xl"
              onClick={() => void onReturn()}
              disabled={busy === "return"}
            >
              {busy === "return" ? <Loader2 className="animate-spin" /> : <Undo2 />} Return to start
            </Button>
          ) : null}

          <Button
            variant="destructive"
            className="rounded-xl"
            onClick={() => {
              triggerHeavyTap();
              setConfirmEnd(true);
            }}
          >
            <Square /> End trip
          </Button>
        </div>
      )}

      <Dialog open={confirmEnd} onOpenChange={setConfirmEnd}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>End this trip?</DialogTitle>
            <DialogDescription>
              Your route will be saved to this device. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setConfirmEnd(false)}>
              Keep tracking
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              onClick={() => {
                setConfirmEnd(false);
                void endTrip();
              }}
            >
              End trip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RecoveryPrompt onContinue={() => void onContinueRecovered()} />
      <TripCompleteModal districtBase={districtBase} onTrackAgain={onTrackAgain} />
      </div>
    </div>
  );
}

function ReturnPanel({
  returnState,
  state,
  onCancel,
}: {
  returnState: ReturnState;
  state: string;
  onCancel: () => void;
}) {
  const off = returnState.offRoute === "OFF_ROUTE_CONFIRMED";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border px-3 py-2.5",
        off ? "border-destructive/30 bg-destructive/8" : "border-primary/25 bg-primary/6"
      )}
    >
      <div className="flex items-center gap-2">
        {off ? <Signal className="size-4 text-destructive" /> : <RotateCcw className="size-4 text-primary" />}
        <p className="text-sm font-semibold">
          {state === "PAUSED" ? "Return paused" : off ? "Off route" : "Returning to start"}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto rounded-lg"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
      <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
        <MiniStat value={formatDistance(returnState.distanceToStart)} label="TO START" />
        <MiniStat
          value={returnState.estimatedMinutes === null ? "—" : `${returnState.estimatedMinutes}`}
          label="MIN"
        />
        <MiniStat value={`${Math.round(returnState.bearingToStart)}°`} label="BEARING" />
      </dl>
    </motion.div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card px-2 py-3 text-center">
      <p className="text-lg font-bold tracking-tight tabular-nums">{value}</p>
      <p className="mt-0.5 text-[0.6rem] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="text-[0.6rem] uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function StatusScreen({
  title,
  message,
  hint,
  icon,
  action,
  busy,
}: {
  title?: string;
  message: string;
  hint?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  busy?: boolean;
}) {
  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center gap-3 px-2 text-center">
      {busy ? (
        <Activity className="size-7 animate-pulse text-primary" />
      ) : (
        icon ?? null
      )}
      {title ? <h2 className="text-base font-semibold">{title}</h2> : null}
      <p className="max-w-xs text-sm text-muted-foreground">{message}</p>
      {hint ? <p className="max-w-xs text-xs text-muted-foreground/80">{hint}</p> : null}
      {action}
    </div>
  );
}

"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Bike,
  Bus,
  CarFront,
  CheckCircle2,
  ChevronLeft,
  LocateFixed,
  Route,
  Truck,
} from "lucide-react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { ScreenHeader } from "@/components/shared/screen-header";
import { Button } from "@/components/ui/button";
import { BookingSummary } from "@/components/shared/booking-summary";
import { useGeolocation, getCurrentPosition } from "@/lib/hooks/use-geolocation";
import type { TransportMode, TransportPlan } from "@/features/transport/types";
import { estimateFare, formatDistanceMeters } from "@/features/transport/lib/fares";
import { saveTransportPlan } from "@/features/transport/api/transport.api";
import { usePlace } from "@/features/places/hooks/usePlaces";
import type { Place } from "@/features/places/types";
import { cn } from "@/lib/utils";

const MODES: {
  id: TransportMode;
  label: string;
  description: string;
  icon: typeof CarFront;
  tone: string;
}[] = [
  { id: "bike", label: "Bike", description: "Quick & cheap", icon: Bike, tone: "bg-emerald-500/12 text-emerald-700" },
  { id: "auto", label: "Auto", description: "The classic rickshaw", icon: Bus, tone: "bg-amber-500/14 text-amber-700" },
  { id: "car", label: "Car", description: "Comfort for 4", icon: CarFront, tone: "bg-primary/10 text-primary" },
  { id: "suv", label: "SUV", description: "Room for a group", icon: Truck, tone: "bg-rose-500/12 text-rose-700" },
];

export default function TransportPage() {
  const params = useParams<{ district: string; placeId: string }>();
  const districtSlug = params.district;
  const placeId = params.placeId;

  const place = usePlace(placeId ? districtSlug : undefined, placeId);
  const { supported, status, position, start, error } = useGeolocation();

  const [rechecking, setRechecking] = React.useState(false);
  const [step, setStep] = React.useState<"choose" | "review" | "done">("choose");
  const [mode, setMode] = React.useState<TransportMode | null>(null);

  React.useEffect(() => {
    if (supported && status === "idle") start();
  }, [supported, status, start]);

  async function refreshLocation() {
    setRechecking(true);
    const pos = await getCurrentPosition();
    if (pos) {
      toast.success("Location updated", { description: "Fare estimates refreshed." });
    } else {
      toast.error("Couldn't get your location", {
        description: error ?? "Please allow location access and retry.",
      });
    }
    setRechecking(false);
  }

  const distanceMeters = React.useMemo(() => {
    if (!position) return null;
    return distanceToPlace(position.latitude, position.longitude, place.data);
  }, [position, place.data]);

  const fare = mode ? estimateFare({ mode, distanceMeters }) : null;

  function confirmPlan() {
    if (!mode || !place.data) return;
    const plan: TransportPlan = {
      mode,
      distanceMeters,
      fareEstimate: fare,
      originLabel: position ? "Your current location" : "Current location (not shared)",
      destinationLabel: place.data.name,
      createdAt: new Date().toISOString(),
    };
    saveTransportPlan(plan);
    setStep("done");
    toast.success("Trip plan ready", {
      description: "Estimated fare — you pay the driver directly.",
    });
  }

  return (
    <div className="pb-8">
      <ScreenHeader
        title="Go To"
        subtitle={place.data?.name ?? "Choose transport"}
        backHref={`/${districtSlug}/places/${placeId}`}
      />

      <div className="app-container mt-2">
        {/* Route summary */}
        <div className="card-surface flex items-center gap-3 rounded-2xl p-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Route className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm">
              <span className="inline-flex size-2 shrink-0 rounded-full bg-success" />
              <span className="truncate font-medium">
                {position ? "Your current location" : "Enable location"}
              </span>
            </div>
            <div className="my-1.5 ml-1 w-px bg-border" />
            <div className="flex items-center gap-2 text-sm">
              <span className="inline-flex size-2 shrink-0 rounded-full bg-primary" />
              <span className="truncate font-semibold">{place.data?.name ?? "…"}</span>
            </div>
          </div>
        </div>

        {/* Location banner */}
        {!position ? (
          <div className="mt-3 flex items-start justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 dark:border-amber-500/30 dark:bg-amber-500/10">
            <div className="flex items-start gap-2.5">
              <LocateFixed className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300" />
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                  {error ? "Location needs attention" : "Share your location for a fare estimate"}
                </p>
                <p className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-200/70">
                  {error ? error : "We use your real position only to estimate distance."}
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="shrink-0 rounded-xl" onClick={() => start()}>
              Allow
            </Button>
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-success/30 bg-success/5 p-3.5">
            <p className="text-xs text-muted-foreground">
              Distance:{" "}
              <span className="font-semibold text-foreground">
                {formatDistanceMeters(distanceMeters) || "unknown"}
              </span>
            </p>
            <Button size="sm" variant="outline" className="h-8 rounded-xl" onClick={refreshLocation} disabled={rechecking}>
              {rechecking ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === "done" && mode && place.data ? (
            <motion.section
              key="done"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 space-y-4"
            >
              <div className="flex flex-col items-center gap-2 py-2 text-center">
                <span className="flex size-16 items-center justify-center rounded-full bg-success/12 text-success">
                  <CheckCircle2 className="size-9" />
                </span>
                <h2 className="text-lg font-bold">Trip plan ready</h2>
                <p className="max-w-xs text-sm text-muted-foreground">
                  Share this route with your driver. Pay the driver directly — Karnataka Tourism Guide never takes payment.
                </p>
              </div>

              <BookingSummary
                title="Your trip"
                rows={[
                  { label: "Mode", value: MODES.find((m) => m.id === mode)?.label ?? mode },
                  { label: "From", value: position ? "Current location" : "Not shared" },
                  { label: "To", value: place.data.name },
                  { label: "Distance", value: formatDistanceMeters(distanceMeters) || "—" },
                ]}
                total={fare !== null ? `₹${fare}` : "Estimate unavailable"}
                totalLabel="Estimated fare"
              />

              <div className="mt-2">
                <Button variant="action" className="w-full rounded-xl" onClick={() => setStep("choose")}>
                  Plan another trip
                </Button>
              </div>
            </motion.section>
          ) : step === "review" && mode ? (
            <motion.section
              key="review"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="mt-6 space-y-4"
            >
              <BookingSummary
                title="Review your trip"
                rows={[
                  { label: "Mode", value: MODES.find((m) => m.id === mode)?.label ?? mode },
                  { label: "From", value: position ? "Current location" : "Not shared" },
                  { label: "To", value: place.data?.name ?? "…" },
                  { label: "Distance", value: formatDistanceMeters(distanceMeters) || "—" },
                  { label: "Estimated fare", value: fare !== null ? `₹${fare}` : "Unavailable", strong: true },
                ]}
                totalLabel=""
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                {fare !== null
                  ? `Estimated ₹${fare} for ${formatDistanceMeters(distanceMeters)} by ${MODES.find((m) => m.id === mode)?.label}. Final amount is settled directly with your driver.`
                  : "Share your location to get an accurate fare estimate for this route."}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="rounded-xl" onClick={() => setStep("choose")}>
                  <ChevronLeft className="size-4" /> Change ride
                </Button>
                <Button variant="action" className="rounded-xl" onClick={confirmPlan}>
                  Confirm plan
                </Button>
              </div>
            </motion.section>
          ) : (
            <motion.section
              key="choose"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -12 }}
              className="mt-6"
            >
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Choose a ride
              </p>
              <div className="space-y-2.5">
                {MODES.map(({ id, label, description, icon: Icon, tone }) => {
                  const selected = mode === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setMode(id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl border bg-card p-4 text-left transition-colors",
                        selected ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40"
                      )}
                    >
                      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", tone)}>
                        <Icon className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{label}</span>
                        <span className="block text-xs text-muted-foreground">{description}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        {selected && fare !== null ? (
                          <span className="text-sm font-bold text-primary">~₹{fare}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {distanceMeters === null ? "needs location" : formatDistanceMeters(distanceMeters)}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5">
                <Button
                  variant="action"
                  size="lg"
                  className="w-full rounded-2xl"
                  disabled={!mode}
                  onClick={() => setStep("review")}
                >
                  {mode ? "Continue" : "Pick a ride to continue"}
                </Button>
              </div>
              <p className="mt-2.5 text-center text-xs text-muted-foreground">
                Fares are distance-based estimates. The confirmed fare is settled directly with your driver.
              </p>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function distanceToPlace(
  lat: number,
  lng: number,
  place: Partial<Place> | undefined
): number | null {
  if (!place || typeof place.latitude !== "number" || typeof place.longitude !== "number") return null;
  if (place.latitude === 0 && place.longitude === 0) return null;
  const R = 6371000;
  const dLat = ((place.latitude - lat) * Math.PI) / 180;
  const dLng = ((place.longitude - lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat * Math.PI) / 180) * Math.cos((place.latitude * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
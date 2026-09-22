"use client";

import * as React from "react";
import { Flag, Route, Satellite, Trash2, Trophy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ScreenHeader } from "@/components/shared/screen-header";
import { SectionHeader } from "@/components/shared/section-header";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import type { Place } from "@/features/places/types";
import { deleteTrip, listTrips } from "@/features/path-tracker/api/path-tracker.api";
import {
  formatDistance,
  formatDuration,
} from "@/features/path-tracker/lib/geometry";
import type { SavedTrip } from "@/features/path-tracker/types";
import { cn } from "@/lib/utils";

export function PathTrackerHub({
  districtSlug,
  districtId,
  places,
}: {
  districtSlug: string;
  districtId: string;
  places: Place[];
}) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Place | null>(places[0] ?? null);
  const [trips, setTrips] = React.useState<SavedTrip[]>([]);

  React.useEffect(() => {
    setTrips(listTrips());
  }, []);

  function start() {
    if (!selected) return;
    router.push(
      `/${districtSlug}/path-tracker/live?placeId=${encodeURIComponent(selected.id)}&name=${encodeURIComponent(selected.name)}`
    );
  }

  return (
    <div className="pb-6">
      <ScreenHeader
        title="Path Tracker"
        subtitle={`${districtSlug} · real GPS, never simulated`}
        backHref={`/${districtSlug}`}
      />

      <div className="app-container">
        {/* How it works */}
        <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Satellite className="size-5" />
          </span>
          <div className="text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">Track your journey for real</p>
            <p className="mt-0.5">
              Pick a destination, start tracking, and the app records your route using
              your phone&apos;s GPS. Your path never leaves this device.
            </p>
          </div>
        </div>

        {/* Choose destination */}
        <section className="mt-6">
          <SectionHeader title="Where are you heading?" subtitle={`Places in ${districtSlug}`} />
          {places.length === 0 ? (
            <EmptyState
              icon={Route}
              title="No places yet"
              description="Add a destination place first — places will appear here once published."
            />
          ) : (
            <div className="space-y-2">
              {places.map((place) => {
                const active = selected?.id === place.id;
                return (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => setSelected(place)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border bg-card p-4 text-left transition-colors",
                      active ? "border-primary ring-2 ring-primary/15" : "border-border"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl",
                        active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Flag className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{place.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {place.category ?? "Place"} · ₹{Math.round(place.entryfee)} entry
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <Button
            variant="action"
            size="lg"
            className="mt-4 w-full rounded-2xl"
            disabled={!selected}
            onClick={start}
          >
            <Satellite className="size-5" /> Start tracking
          </Button>
        </section>

        {/* Saved trips */}
        <section className="mt-8">
          <SectionHeader title="Your trips" subtitle="Completed routes on this device" />
          {trips.length === 0 ? (
            <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
              <Trophy className="size-5 shrink-0" />
              Complete a route and it will be saved here.
            </div>
          ) : (
            <div className="space-y-2.5">
              {trips.map((trip) => (
                <div
                  key={trip.id}
                  className="card-surface group flex items-center gap-3 rounded-2xl p-3.5"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success/12 text-emerald-700">
                    <Route className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{trip.destination.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDistance(trip.distanceMeters)} ·{" "}
                      {formatDuration(trip.startedAt, trip.endedAt)} ·{" "}
                      {trip.points.length} points
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      deleteTrip(trip.id);
                      setTrips(listTrips());
                    }}
                    aria-label="Delete trip"
                    className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-[18px]" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          <Link href="/about" className="underline underline-offset-2">
            How path tracking & privacy work
          </Link>
        </p>
      </div>
    </div>
  );
}
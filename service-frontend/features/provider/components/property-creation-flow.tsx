"use client";

import * as React from "react";
import { BedSingle, Building2, Check, Sparkles, ArrowRight, RotateCcw } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/shared/glass-card";
import { HotelForm } from "@/features/provider/components/hotel-form";
import { StayForm } from "@/features/provider/components/stay-form";
import type { StateRef } from "@/features/locations/api/locations.api";

type PropertyType = "HOTEL" | "STAY";

export function PropertyCreationFlow({
  initialStates,
}: {
  initialStates: StateRef[];
}) {
  const searchParams = useSearchParams();
  const initialTypeFromUrl = searchParams.get("type")?.toUpperCase();
  const defaultType: PropertyType | null =
    initialTypeFromUrl === "HOTEL" || initialTypeFromUrl === "STAY"
      ? (initialTypeFromUrl as PropertyType)
      : null;

  const [selectedType, setSelectedType] = React.useState<PropertyType | null>(defaultType);

  if (selectedType === "HOTEL") {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Building2 className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">Creating a Hotel</p>
              <p className="text-xs text-muted-foreground">
                Standard hotel or resort with room types, amenities and star rating.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSelectedType(null)}
            className="rounded-xl text-xs"
          >
            <RotateCcw className="size-3.5 mr-1.5" /> Change Property Type
          </Button>
        </div>

        <HotelForm
          submitLabel="Submit Hotel for Review"
          initialStates={initialStates}
        />
      </div>
    );
  }

  if (selectedType === "STAY") {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 dark:bg-emerald-950/20">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <BedSingle className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                Creating a Stay / Backpacker Hostel
              </p>
              <p className="text-xs text-emerald-800 dark:text-emerald-400">
                Backpacker hostel, homestay or guesthouse with dorm beds, community spaces, and activities.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSelectedType(null)}
            className="rounded-xl text-xs"
          >
            <RotateCcw className="size-3.5 mr-1.5" /> Change Property Type
          </Button>
        </div>

        <StayForm
          submitLabel="Submit Stay for Review"
          initialStates={initialStates}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center max-w-xl mx-auto space-y-2">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
          Select Property Type
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Choose the accommodation category for your new listing. Each property type opens a tailored management form with the appropriate inventory structures.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 pt-2">
        {/* HOTEL CARD */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setSelectedType("HOTEL")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setSelectedType("HOTEL");
            }
          }}
          className="group relative flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-sm transition-all hover:border-primary/50 hover:shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Building2 className="size-6" />
              </span>
              <Badge variant="outline" className="text-xs">
                Standard Lodging
              </Badge>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-foreground">Hotel or Resort</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Traditional hotel, business hotel, luxury resort, or lodge with standard room-based bookings.
              </p>
            </div>

            <ul className="space-y-2 border-t border-border/70 pt-4 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-primary shrink-0" />
                <span>Room types (Deluxe, Suite, Standard, AC/Non-AC)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-primary shrink-0" />
                <span>Per-room nightly pricing and room inventory</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-primary shrink-0" />
                <span>Star classification (1 to 5 Stars)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-primary shrink-0" />
                <span>Check-in & check-out policy configuration</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-border/60">
            <Button
              type="button"
              variant="default"
              className="w-full rounded-xl"
              onClick={() => setSelectedType("HOTEL")}
            >
              Continue with Hotel
              <ArrowRight className="size-4 ml-1.5" />
            </Button>
          </div>
        </div>

        {/* STAY / HOSTEL CARD */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setSelectedType("STAY")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setSelectedType("STAY");
            }
          }}
          className="group relative flex flex-col justify-between rounded-3xl border border-emerald-500/30 bg-card p-6 shadow-sm transition-all hover:border-emerald-500 hover:shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-emerald-500/20"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                <BedSingle className="size-6" />
              </span>
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs">
                Hostels & Homestays
              </Badge>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-foreground">Backpacker Hostel or Stay</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Zostel-style backpacker hostel, homestay, guesthouse, or dorm stay designed for travellers and community experiences.
              </p>
            </div>

            <ul className="space-y-2 border-t border-border/70 pt-4 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Shared dormitories (Mixed / Female dorms) & Private rooms</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Bed capacity & Per-bed or per-room pricing</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Hostel facilities (Common room, Shared kitchen, Lockers)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Social activities (Walking tours, Bonfires, Games night)</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-border/60">
            <Button
              type="button"
              className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setSelectedType("STAY")}
            >
              Continue with Stay
              <ArrowRight className="size-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { ArrowRight, Check, Globe2, Hotel, MapPin, Soup } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { useCurrentDistrict } from "@/features/locations/state/current-district-provider";
import type { DistrictSummary, StateSummary } from "@/features/locations/types";
import { cn } from "@/lib/utils";

/**
 * "Choose District" — shows ONLY districts belonging to the selected state.
 * No other state's districts, places, hotels, restaurants or guides appear.
 * Selecting a district persists the full state → district selection and moves
 * straight into the selected district experience (never asked again).
 */
export function StateDistrictsView({
  state,
  districts,
}: {
  state: StateSummary;
  districts: DistrictSummary[];
}) {
  const router = useRouter();
  const { slug, setDestination } = useCurrentDistrict();

  function pick(d: DistrictSummary) {
    setDestination(state.slug, d.slug);
    toast.success("District selected", { description: d.name });
    router.push(`/${d.slug}`);
  }

  return (
    <div className="space-y-4">
      {/* Selected state banner */}
      <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
          <Check className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Selected State
          </p>
          <p className="truncate font-bold">{state.name}</p>
        </div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="rounded-full text-primary"
        >
          <a href="/explore">Change</a>
        </Button>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Choose District
        </h2>
        {districts.length === 0 ? (
          <EmptyState
            icon={Globe2}
            title="No districts yet"
            description={`There are no districts listed for ${state.name} right now.`}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {districts.map((d) => {
              const active = slug === d.slug;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => pick(d)}
                  className={cn(
                    "card-surface group flex flex-col gap-3 rounded-2xl p-4 text-left transition-colors hover:border-primary/40",
                    active && "border-primary ring-2 ring-primary/15"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 to-primary text-white">
                      <MapPin className="size-5" />
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                      Explore <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold tracking-tight">{d.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {state.name} · India
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[0.7rem] text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium">
                      <MapPin className="size-3" /> {d.placeCount} places
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium">
                      <Hotel className="size-3" /> {d.hotelCount} hotels
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium">
                      <Soup className="size-3" /> {d.restaurantCount} restaurants
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
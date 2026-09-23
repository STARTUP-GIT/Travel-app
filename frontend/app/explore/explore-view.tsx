"use client";

import { ArrowRight, Globe2, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/states";
import { useCurrentDistrict } from "@/features/locations/state/current-district-provider";
import type { StateSummary } from "@/features/locations/types";

/**
 * "Choose State" — shows ONLY states. Districts, places, hotels, restaurants
 * and guides never appear here. Selecting a state moves to the separate
 * district-selection screen for that state.
 */
export function ExploreView({ states }: { states: StateSummary[] }) {
  const router = useRouter();
  const { stateSlug, setStateSlug } = useCurrentDistrict();

  function pick(s: StateSummary) {
    setStateSlug(s.slug);
    toast.success("State selected", { description: s.name });
    router.push(`/explore/${s.slug}`);
  }

  if (states.length === 0) {
    return (
      <EmptyState
        icon={Globe2}
        title="No states yet"
        description="States appear here once the admin enables them for the app."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {states.map((s) => {
        const active = stateSlug === s.slug;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => pick(s)}
            className={`card-surface group flex flex-col gap-3 rounded-2xl p-4 text-left transition-colors hover:border-primary/40 ${
              active ? "border-primary ring-2 ring-primary/15" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 to-primary text-white">
                <Globe2 className="size-5" />
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                Choose state <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">{s.name}</h2>
              <p className="text-xs text-muted-foreground">
                {s.country?.name ?? "India"}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[0.7rem] text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium">
                <MapPin className="size-3" />
                {s.districtCount} districts
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium">
                {s.placeCount} places &amp; stays
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
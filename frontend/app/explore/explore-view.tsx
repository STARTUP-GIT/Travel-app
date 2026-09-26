"use client";

import { ArrowLeft, ArrowRight, Check, Globe2, Hotel, MapPin, RefreshCw, Soup } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { AppImage } from "@/components/shared/app-image";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentDistrict } from "@/features/locations/state/current-district-provider";
import type { DistrictSummary, StateSummary } from "@/features/locations/types";
import { cn } from "@/lib/utils";

type Props = {
  /** Enabled states, loaded server-side from GET /api/states. */
  states: StateSummary[];
  /** Enabled districts of those states, from GET /api/districts. */
  districts: DistrictSummary[];
  /** Set when a request failed; the page still renders its own state. */
  loadError: string | null;
};

/**
 * "Choose Destination" — a two step flow on one screen.
 *
 * Step 1 lists the enabled states. Step 2 lists the enabled districts of the
 * selected state, filtered from the same server-loaded data (no browser ->
 * backend request, so nothing here depends on CORS or can fail at runtime).
 * Choosing a district navigates to /{stateSlug}/{districtSlug}, so both
 * segments are always part of the URL.
 */
export function ExploreView({ states, districts, loadError }: Props) {
  const router = useRouter();
  const { stateSlug, setStateSlug, setDestination } = useCurrentDistrict();

  const [selectedState, setSelectedState] = React.useState<StateSummary | null>(null);

  const districtsByState = React.useMemo(() => {
    const map = new Map<string, DistrictSummary[]>();
    for (const district of districts) {
      const list = map.get(district.stateId) ?? [];
      list.push(district);
      map.set(district.stateId, list);
    }
    return map;
  }, [districts]);

  // Derive the restored selection from the remembered slug to avoid syncing
  // React state from an effect.
  const effectiveSelectedState =
    selectedState ?? states.find((state) => state.slug === stateSlug) ?? null;

  const stateDistricts = effectiveSelectedState
    ? (districtsByState.get(effectiveSelectedState.id) ?? [])
    : [];

  function chooseState(state: StateSummary) {
    setSelectedState(state);
    // Remember the state so re-entering /explore resumes at the district step.
    setStateSlug(state.slug);
    toast.success("State selected", { description: state.name });
  }

  function changeState() {
    setSelectedState(null);
    setStateSlug("");
  }

  function chooseDistrict(district: DistrictSummary, state: StateSummary) {
    setDestination(state.slug, district.slug);
    router.push(`/${state.slug}/${district.slug}`);
  }

  if (loadError && states.length === 0) {
    return (
      <ErrorState
        title="Couldn't load destinations"
        description={`${loadError} Please check your connection and try again.`}
        retry={() => router.refresh()}
      />
    );
  }

  if (states.length === 0) {
    return (
      <EmptyState
        icon={Globe2}
        title="No destinations available yet"
        description="States appear here as soon as an admin enables them for the app."
      />
    );
  }

  return (
    <div className="space-y-6">
      <StepIndicator active={selectedState ? "district" : "state"} />

      {loadError ? (
        <p className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-xs text-warning">
          Some destination data could not be loaded ({loadError}). What is shown
          below is the latest available data.
        </p>
      ) : null}

      {selectedState ? (
        <DistrictStepView
          state={selectedState}
          districts={stateDistricts}
          onBack={changeState}
          onRefresh={() => router.refresh()}
          onSelect={(district) => chooseDistrict(district, selectedState)}
        />
      ) : (
        <StateStepView states={states} onSelect={chooseState} />
      )}
    </div>
  );
}

function StepIndicator({ active }: { active: "state" | "district" }) {
  const steps = [
    { key: "state", label: "State" },
    { key: "district", label: "District" },
  ] as const;

  const activeIndex = steps.findIndex((s) => s.key === active);

  return (
    <ol className="flex items-center gap-2" aria-label="Destination steps">
      {steps.map((step, i) => {
        const done = i < activeIndex;
        const current = i === activeIndex;
        return (
          <li key={step.key} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                current
                  ? "bg-primary text-primary-foreground"
                  : done
                    ? "bg-success/15 text-success"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {done ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span
              className={cn(
                "text-xs font-semibold uppercase tracking-wider",
                current ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
            {i < steps.length - 1 ? (
              <span aria-hidden className="h-px flex-1 bg-border" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function StateStepView({
  states,
  onSelect,
}: {
  states: StateSummary[];
  onSelect: (state: StateSummary) => void;
}) {
  return (
    <section aria-labelledby="choose-state-heading" className="space-y-3">
      <div>
        <h2 id="choose-state-heading" className="text-base font-bold tracking-tight">
          Choose your state
        </h2>
        <p className="text-xs text-muted-foreground">
          Only states that are currently available can be selected.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {states.map((state) => (
          <button
            key={state.id}
            type="button"
            onClick={() => onSelect(state)}
            className="card-surface card-surface-hover group flex flex-col gap-3 rounded-2xl p-3 text-left"
          >
            <div className="relative aspect-[16/10] overflow-hidden rounded-xl">
              <AppImage
                src={state.primaryImage}
                alt={state.name}
                className="transition-transform duration-500 group-hover:scale-105"
                fallbackClassName="bg-gradient-to-br from-blue-800 via-primary to-indigo-800"
              />
              <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/85 px-2 py-1 text-[0.65rem] font-semibold text-primary backdrop-blur-md">
                <Globe2 className="size-3" />
                {state.country?.name ?? "India"}
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-2 px-0.5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="line-clamp-1 text-base font-bold tracking-tight">
                  {state.name}
                </h3>
                <ArrowRight className="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
              </div>
              <div className="mt-auto flex flex-wrap gap-1.5 text-[0.7rem] text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium">
                  <MapPin className="size-3" />
                  {state.districtCount} district{state.districtCount === 1 ? "" : "s"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium">
                  {state.placeCount} places &amp; stays
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function DistrictStepView({
  state,
  districts,
  onBack,
  onRefresh,
  onSelect,
}: {
  state: StateSummary;
  districts: DistrictSummary[];
  onBack: () => void;
  onRefresh: () => void;
  onSelect: (district: DistrictSummary) => void;
}) {
  return (
    <section aria-labelledby="choose-district-heading" className="space-y-4">
      <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
          <Check className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Selected state
          </p>
          <p className="truncate font-bold">{state.name}</p>
        </div>
        <Button variant="ghost" size="sm" className="rounded-full text-primary" onClick={onBack}>
          <ArrowLeft className="size-3.5" />
          Change
        </Button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div>
          <h2
            id="choose-district-heading"
            className="text-base font-bold tracking-tight"
          >
            Choose a district in {state.name}
          </h2>
          <p className="text-xs text-muted-foreground">
            Only districts available in {state.name} are listed.
          </p>
        </div>
        <Badge variant="success" className="shrink-0 text-[0.65rem]">
          {districts.length} available
        </Badge>
      </div>

      {districts.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No districts available"
          description={`There are no districts available in ${state.name} right now.`}
          action={
            <Button variant="outline" className="rounded-xl" onClick={onBack}>
              <ArrowLeft className="size-4" />
              Choose another state
            </Button>
          }
        />
      ) : null}

      {districts.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {districts.map((district) => (
            <button
              key={district.id}
              type="button"
              onClick={() => onSelect(district)}
              className="card-surface card-surface-hover group flex flex-col gap-3 rounded-2xl p-4 text-left"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MapPin className="size-5" />
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  Explore <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
              <div>
                <h3 className="line-clamp-1 text-base font-bold tracking-tight">
                  {district.name}
                </h3>
                <p className="text-xs text-muted-foreground">{state.name} · India</p>
              </div>
              <div className="mt-auto flex flex-wrap gap-1.5 text-[0.7rem] text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium">
                  <MapPin className="size-3" /> {district.placeCount} places
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium">
                  <Hotel className="size-3" /> {district.hotelCount} hotels
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium">
                  <Soup className="size-3" /> {district.restaurantCount} restaurants
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : null}

      <Button variant="ghost" className="w-full rounded-xl" onClick={onRefresh}>
        <RefreshCw className="size-4" />
        Refresh districts
      </Button>
    </section>
  );
}

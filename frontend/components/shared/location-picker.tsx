"use client";

import { ChevronLeft, Globe2, MapPin, Rocket } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCurrentDistrict } from "@/features/locations/state/current-district-provider";
import type { DistrictSummary, State } from "@/features/locations/types";
import { slugify } from "@/features/locations/utils/slug";
import { cn } from "@/lib/utils";

type LocationPickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  districts: DistrictSummary[];
  /** Optional explicit district to pre-select. */
  initialSlug?: string | null;
};

/**
 * State → District → Explore flow used on the home screen. Districts come
 * from the backend; states are derived from the district hierarchy so nothing
 * is hardcoded.
 */
export function LocationPicker({
  open,
  onOpenChange,
  districts,
  initialSlug,
}: LocationPickerProps) {
  const router = useRouter();
  const { slug: contextSlug, setSlug, setStateSlug, setDestination } = useCurrentDistrict();
  const currentSlug = initialSlug ?? contextSlug;

  const states = React.useMemo(() => {
    const map = new Map<string, State>();
    for (const d of districts) {
      if (d.state && !map.has(d.state.id)) {
        map.set(d.state.id, d.state);
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [districts]);

  const [selectedStateId, setSelectedStateId] = React.useState<string | null>(
    states[0]?.id ?? null
  );
  const [chosenSlug, setChosenSlug] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      const initial = districts.find((d) => d.slug === currentSlug);
      setSelectedStateId((prev) => {
        if (prev && states.some((s) => s.id === prev)) return prev;
        return initial?.stateId ?? states[0]?.id ?? null;
      });
      setChosenSlug(currentSlug);
    }
  }, [open, states, currentSlug, districts]);

  const districtsOfState = React.useMemo(
    () =>
      districts.filter(
        (d) =>
          !selectedStateId || d.stateId === selectedStateId
      ),
    [districts, selectedStateId]
  );

  function handleContinue() {
    if (chosenSlug) {
      const chosenDistrict = districts.find((d) => d.slug === chosenSlug);
      const selectedState = states.find((s) => s.id === selectedStateId) ?? null;
      const nextStateSlug = selectedState
        ? slugify(selectedState.name)
        : chosenDistrict?.state
          ? slugify(chosenDistrict.state.name)
          : null;

      if (chosenDistrict && nextStateSlug) {
        setDestination(nextStateSlug, chosenDistrict.slug);
      } else if (chosenDistrict) {
        setSlug(chosenSlug);
        if (chosenDistrict.state) {
          setStateSlug(slugify(chosenDistrict.state.name));
        }
      }

      onOpenChange(false);
      router.push(nextStateSlug ? `/${nextStateSlug}/${chosenSlug}` : `/${chosenSlug}`);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto w-full max-w-lg rounded-t-3xl border-border pb-[max(env(safe-area-inset-bottom),1rem)]"
      >
        <SheetHeader className="px-1 pt-2 text-left">
          <SheetTitle className="flex items-center gap-2 text-[1.05rem]">
            <Globe2 className="size-5 text-primary" />
            Where would you like to explore?
          </SheetTitle>
        </SheetHeader>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <section aria-label="State">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              State
            </p>
            <div className="flex flex-col gap-2">
              {states.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSelectedStateId(s.id);
                    setChosenSlug(null);
                  }}
                  className={cn(
                    "flex items-center justify-between rounded-xl border px-3.5 py-3 text-sm font-medium transition-colors",
                    selectedStateId === s.id
                      ? "border-primary bg-primary/8 text-primary"
                      : "border-border bg-card text-foreground hover:bg-accent/50"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Globe2 className="size-4" />
                    {s.name}
                  </span>
                  {s.isServiceAvailable ? (
                    <Badge variant="success">Active</Badge>
                  ) : null}
                </button>
              ))}
            </div>
          </section>

          <section aria-label="District">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                District
              </p>
              {selectedStateId ? (
                <button
                  type="button"
                  onClick={() => {
                    if (chosenSlug) {
                      setChosenSlug(null);
                    }
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
                >
                  <ChevronLeft className="size-3.5" />
                  Change
                </button>
              ) : null}
            </div>
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {districtsOfState.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  No districts listed yet.
                </p>
              ) : (
                districtsOfState.map((d) => {
                  const selected = chosenSlug === d.slug;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setChosenSlug(d.slug)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-xl border px-3.5 py-3 text-sm font-medium transition-colors",
                        selected
                          ? "border-success bg-success/8 text-emerald-700"
                          : "border-border bg-card text-foreground hover:bg-accent/50"
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <MapPin className={cn("size-4 shrink-0", selected && "text-success")} />
                        <span className="truncate">{d.name}</span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {d.placeCount + d.hotelCount + d.restaurantCount} spots
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </section>
        </div>

        <Button
          variant="action"
          size="lg"
          className="mt-5 w-full rounded-xl"
          disabled={!chosenSlug}
          onClick={handleContinue}
        >
          <Rocket className="size-4" />
          Explore {chosenSlug ? districts.find((d) => d.slug === chosenSlug)?.name ?? "" : ""}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
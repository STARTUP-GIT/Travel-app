"use client";

import { BedSingle, Compass, Hotel, Soup, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { PROVIDER_KIND_META } from "@/features/provider/config";
import { PROVIDER_KINDS, type ProviderKind } from "@/features/provider/types";

const ICONS: Record<ProviderKind, LucideIcon> = {
  hotel: Hotel,
  restaurant: Soup,
  common_guide: Compass,
  specific_guide: Compass,
};

export type AccommodationPortal = "hotel" | "stays";

/**
 * The provider kind picker displays the 4 account types.
 * For the accommodation category, it provides an in-card toggle between:
 * - Hotel: standard hotel management
 * - Stays: backpacker hostel, homestay, dorm & community stays
 */
export function ProviderKindPicker({
  value,
  onChange,
  accommodationPortal = "hotel",
  onAccommodationPortalChange,
  columns = 2,
}: {
  value: ProviderKind | null;
  onChange: (kind: ProviderKind) => void;
  accommodationPortal?: AccommodationPortal;
  onAccommodationPortalChange?: (portal: AccommodationPortal) => void;
  columns?: 1 | 2;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Account type"
      className={cn(
        "grid gap-3",
        columns === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"
      )}
    >
      {PROVIDER_KINDS.map((kind) => {
        const meta = PROVIDER_KIND_META[kind];
        const active = value === kind;

        if (kind === "hotel") {
          const isStays = accommodationPortal === "stays";
          const DisplayIcon = isStays ? BedSingle : Hotel;
          const displayLabel = isStays ? "Stays & Hostels" : meta.label;
          const displayBlurb = isStays
            ? "Manage backpacker hostels, dorm beds, homestays and community travel stays."
            : meta.blurb;

          return (
            <div
              key={kind}
              role="radio"
              tabIndex={0}
              aria-checked={active}
              aria-label={`Accommodation - ${isStays ? "Stays" : "Hotel"}`}
              onClick={() => onChange("hotel")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onChange("hotel");
                }
              }}
              className={cn(
                "flex flex-col justify-between rounded-2xl border p-4 text-left transition-all cursor-pointer",
                "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                active
                  ? "border-primary/60 bg-primary/8 shadow-[0_10px_30px_-14px_rgb(30_64_175_/_0.55)]"
                  : "border-border bg-card hover:border-primary/35 hover:bg-accent/60"
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-primary/10 text-primary"
                  )}
                >
                  <DisplayIcon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="block text-sm font-semibold">{displayLabel}</span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.65rem] font-semibold text-primary">
                      {isStays ? "Hostel / Stay" : "Hotel"}
                    </span>
                  </div>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                    {displayBlurb}
                  </span>
                </span>
              </div>

              {/* In-card Hotel vs Stays toggle */}
              <div
                role="group"
                aria-label="Accommodation portal selection"
                className="mt-3 flex items-center rounded-xl border border-border/70 bg-background/80 p-1 text-xs font-semibold backdrop-blur-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  role="radio"
                  id="portal-toggle-hotel"
                  aria-checked={!isStays}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange("hotel");
                    onAccommodationPortalChange?.("hotel");
                  }}
                  className={cn(
                    "flex-1 rounded-lg py-1.5 px-2 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    !isStays
                      ? "bg-primary text-primary-foreground shadow-sm font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Hotel
                </button>
                <button
                  type="button"
                  role="radio"
                  id="portal-toggle-stays"
                  aria-checked={isStays}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange("hotel");
                    onAccommodationPortalChange?.("stays");
                  }}
                  className={cn(
                    "flex-1 rounded-lg py-1.5 px-2 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring flex items-center justify-center gap-1",
                    isStays
                      ? "bg-emerald-600 text-white shadow-sm font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>Stays</span>
                  <span
                    className={cn(
                      "rounded-full px-1 text-[0.6rem] font-bold uppercase",
                      isStays
                        ? "bg-white/20 text-white"
                        : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    )}
                  >
                    Hostels
                  </span>
                </button>
              </div>
            </div>
          );
        }

        const Icon = ICONS[kind];

        return (
          <button
            key={kind}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(kind)}
            className={cn(
              "flex items-start gap-3 rounded-2xl border p-4 text-left transition-all",
              "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
              active
                ? "border-primary/60 bg-primary/8 shadow-[0_10px_30px_-14px_rgb(30_64_175_/_0.55)]"
                : "border-border bg-card hover:border-primary/35 hover:bg-accent/60"
            )}
          >
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary/10 text-primary"
              )}
            >
              <Icon className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{meta.label}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                {meta.blurb}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

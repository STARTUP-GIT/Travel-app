"use client";

import { Compass, Hotel, Soup, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { PROVIDER_KIND_META } from "@/features/provider/config";
import { PROVIDER_KINDS, type ProviderKind } from "@/features/provider/types";

const ICONS: Record<ProviderKind, LucideIcon> = {
  hotel: Hotel,
  restaurant: Soup,
  common_guide: Compass,
  specific_guide: Compass,
};

/**
 * The four provider roles are four separate backend routers, so the account type
 * has to be chosen before anything can be authenticated.
 */
export function ProviderKindPicker({
  value,
  onChange,
  columns = 2,
}: {
  value: ProviderKind | null;
  onChange: (kind: ProviderKind) => void;
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
        const Icon = ICONS[kind];
        const active = value === kind;

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

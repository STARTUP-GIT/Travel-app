import { ArrowRight, MapPin, Route } from "lucide-react";
import Link from "next/link";

import { AppImage } from "@/components/shared/app-image";
import { GlassCard } from "@/components/shared/glass-card";
import { Badge } from "@/components/ui/badge";
import { GuideAvatar } from "@/features/guides/ui/guide-card";
import type { PackageWithContext } from "@/features/guides/types";
import { cn, formatCurrency } from "@/lib/utils";

/**
 * A tour package on the district guides page.
 *
 * The card links to the package, not to the guide: the package is what a
 * traveller is actually choosing, and its places are already the ones they are
 * looking at. The guide is credited on the card so it is still clear who runs
 * the tour.
 */
export function PackageCard({
  pkg,
  districtSlug,
  stateSlug,
  className,
}: {
  pkg: PackageWithContext;
  districtSlug: string;
  stateSlug?: string;
  className?: string;
}) {
  const districtBase = stateSlug ? `/${stateSlug}/${districtSlug}` : "/explore";
  const person = pkg.guide;
  const cover = pkg.places.find((place) => place.images?.[0])?.images?.[0];

  return (
    <GlassCard hover className={cn("group", className)}>
      <Link
        href={`${districtBase}/guides/${person.id}/packages/${pkg.id}`}
        className="flex flex-1 flex-col gap-3 p-4"
      >
        <div className="flex items-start gap-3">
          <GuideAvatar
            name={person.full_name}
            image={person.profile_pic}
            className="size-12 shrink-0 ring-2 ring-border"
          />
          <div className="min-w-0 flex-1">
            <h3 className="flex items-center gap-1.5 truncate font-semibold leading-tight">
              <Route className="size-4 shrink-0 text-primary" />
              {pkg.name}
            </h3>
            {/*
              The agency is named in preference to the individual when there is
              one: a traveller choosing a tour is usually choosing the company.
              The guide is still credited below it, because for an agency-run tour
              the person who actually leads it is part of what is being sold.
            */}
            {person.agencyName ? (
              <>
                <p className="mt-0.5 truncate text-sm font-medium">
                  {person.agencyName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  with {person.full_name}
                </p>
              </>
            ) : (
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                with {person.full_name}
              </p>
            )}
          </div>
        </div>

        {cover ? (
          <div className="aspect-[16/9] w-full overflow-hidden rounded-xl">
            <AppImage src={cover} alt={pkg.name} />
          </div>
        ) : null}

        <p className="line-clamp-2 text-sm text-muted-foreground">
          {pkg.description ?? `A guided tour of ${pkg.placeCount} places.`}
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="gap-1">
            <MapPin className="size-3" />
            {pkg.placeCount} stop{pkg.placeCount === 1 ? "" : "s"}
          </Badge>
          {pkg.places.slice(0, 2).map((place) => (
            <Badge key={place.id} variant="outline" className="gap-1">
              <MapPin className="size-3" />
              {place.name}
            </Badge>
          ))}
          {/*
            `places` only holds this district's stops, so the leftover is
            counted against the real `placeCount` — the rest of the tour is
            elsewhere, not hidden behind a truncation on this page.
          */}
          {pkg.placeCount - pkg.places.length > 0 ? (
            <Badge variant="outline">
              +{pkg.placeCount - pkg.places.length} elsewhere
            </Badge>
          ) : null}
          {pkg.pickupName ? (
            <Badge variant="outline" className="gap-1 bg-muted/30">
              <MapPin className="size-3 text-primary" />
              Pickup: {pkg.pickupName}
            </Badge>
          ) : null}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/70 pt-3">
          <span className="text-sm">
            <span className="font-semibold text-primary">
              {formatCurrency(pkg.price && pkg.price > 0 ? pkg.price : person.cost)}
            </span>
            <span className="text-muted-foreground">
              {pkg.pricingMode === "PLACE_BASED"
                ? " · Place Based"
                : pkg.pricingUnit === "PER_PERSON"
                  ? " per person"
                  : " per tour"}
            </span>
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-transform group-hover:translate-x-0.5">
            View tour <ArrowRight className="size-3.5" />
          </span>
        </div>
      </Link>
    </GlassCard>
  );
}

"use client";

import { ArrowLeft, MapPin, Route } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { EmptyState } from "@/components/shared/states";
import { GlassCard } from "@/components/shared/glass-card";
import { MediaRowCard } from "@/components/shared/media-row-card";
import { ScreenHeader } from "@/components/shared/screen-header";
import { SectionHeader } from "@/components/shared/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GuideAvatar } from "@/features/guides/ui/guide-card";
import { GuideBookingSheet } from "@/features/guides/ui/guide-profile";
import type { GuideWithContext, PackageWithContext } from "@/features/guides/types";
import { formatCurrency } from "@/lib/utils";

/**
 * A tour package, reached from the guides page or from a common guide's profile.
 *
 * Booking reuses the guide booking sheet with the package's places pre-selected
 * and no others on offer: the traveller asked for this tour, so the sheet shows
 * exactly the places it contains. A place can still be deselected there, and the
 * guide confirms the request as usual — the package is a convenience, not a
 * separate paid product, so the guide's own per-place rate is what is charged.
 */
export function PackageDetail({
  pkg,
  districtSlug,
  stateSlug,
  districtId,
}: {
  pkg: PackageWithContext;
  districtSlug: string;
  stateSlug?: string;
  districtId: string;
}) {
  const [bookingOpen, setBookingOpen] = React.useState(false);
  const person = pkg.guide;
  const districtBase = stateSlug ? `/${stateSlug}/${districtSlug}` : "/explore";

  // A package can cover places in more than one district, but only this
  // district's places are loaded here — the customer guide data is aggregated
  // from the district's place responses. The real size is carried on the
  // package, so the difference is stated rather than hidden.
  const hiddenPlaceCount = pkg.placeCount - pkg.places.length;

  // The sheet books a common guide, so it is handed a guide context scoped to
  // this package's places rather than the guide's whole coverage.
  const scopedGuide: GuideWithContext = {
    type: "common",
    guide: person,
    places: pkg.places.map(({ id, name, slug, districtName, images }) => ({
      id,
      name,
      slug,
      districtName,
      images,
    })),
    packages: [],
  };

  const placesForGuide = scopedGuide.type === "common" ? scopedGuide.places : [];

  return (
    <div className="pb-8">
      <ScreenHeader
        title={pkg.name}
        subtitle={`${pkg.placeCount} stop${pkg.placeCount === 1 ? "" : "s"} · guided by ${person.full_name}`}
        backHref={`${districtBase}/guides/${person.id}`}
      />

      <div className="app-container space-y-8">
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <GuideAvatar
              name={person.full_name}
              image={person.profile_pic}
              className="size-12 shrink-0 ring-2 ring-border"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold leading-tight">
                {person.full_name}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {person.tagline ?? "Local guide"}
              </p>
            </div>
            <Button asChild variant="outline" className="shrink-0">
              <Link href={`${districtBase}/guides/${person.id}`}>Guide profile</Link>
            </Button>
          </div>

          {pkg.description ? (
            <p className="text-[0.95rem] leading-relaxed text-foreground/90">
              {pkg.description}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success" className="gap-1">
              <Route className="size-3" />
              {pkg.placeCount} stop{pkg.placeCount === 1 ? "" : "s"}
            </Badge>
            <Badge variant="outline">
              {formatCurrency(person.cost)} per place
            </Badge>
          </div>

          {hiddenPlaceCount > 0 ? (
            <p className="rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              {hiddenPlaceCount} more stop{hiddenPlaceCount === 1 ? "" : "s"} of
              this tour {hiddenPlaceCount === 1 ? "is" : "are"} in other
              districts. Booking from here covers the {pkg.places.length} below —
              message {person.full_name} to add the rest.
            </p>
          ) : null}

          {/* Nothing can be booked from a district the tour does not touch. */}
          {pkg.places.length > 0 ? (
            <Button
              variant="action"
              className="w-full rounded-2xl"
              onClick={() => setBookingOpen(true)}
            >
              Book this tour
            </Button>
          ) : null}
        </section>

        <section>
          <SectionHeader
            title="Places in this tour"
            subtitle={
              hiddenPlaceCount > 0
                ? "The stops in this district"
                : "All of them are included in the tour"
            }
          />
          {pkg.places.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="No places listed"
              description="This tour does not cover any place in this district yet."
            />
          ) : (
            <div className="space-y-2.5">
              {pkg.places.map((place) => (
                <MediaRowCard
                  key={place.id}
                  href={`${districtBase}/places/${place.id}`}
                  title={place.name}
                  subtitle={place.districtName}
                  icon={<MapPin className="size-4" />}
                />
              ))}
            </div>
          )}
        </section>

        <GlassCard className="gap-2 p-4">
          <Link
            href={`${districtBase}/guides`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
          >
            <ArrowLeft className="size-4" />
            Back to all guides
          </Link>
        </GlassCard>
      </div>

      <GuideBookingSheet
        // The sheet seeds its selection from `defaultSelectedPlaceIds` when it
        // mounts, so keying it on the package is what makes a client-side jump
        // from one tour to another preselect the new stops instead of keeping
        // the previous tour's.
        key={pkg.id}
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        guide={scopedGuide}
        districtSlug={districtSlug}
        stateSlug={stateSlug}
        districtId={districtId}
        placesForGuide={placesForGuide}
        // The package's places are the reason this page exists, so they start
        // selected rather than leaving an empty sheet.
        defaultSelectedPlaceIds={pkg.places.map((place) => place.id)}
      />
    </div>
  );
}

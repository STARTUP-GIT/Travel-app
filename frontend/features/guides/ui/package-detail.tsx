"use client";

import {
  ArrowLeft,
  Award,
  Building2,
  Calendar,
  Car,
  Clock,
  ExternalLink,
  Info,
  Languages,
  MapPin,
  Route,
  ShieldCheck,
  Star,
  Ticket,
  Utensils,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { EmptyState } from "@/components/shared/states";
import { GlassCard } from "@/components/shared/glass-card";
import { ScreenHeader } from "@/components/shared/screen-header";
import { SectionHeader } from "@/components/shared/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GuideAvatar } from "@/features/guides/ui/guide-card";
import { PackageBookingModal } from "@/features/guides/ui/package-booking-modal";
import type { GuideWithContext, PackageWithContext } from "@/features/guides/types";
import { formatCurrency } from "@/lib/utils";

function formatStatus(status?: string | null): { text: string; variant: "success" | "warning" | "destructive" | "outline" } {
  switch (status?.toUpperCase()) {
    case "INCLUDED":
      return { text: "Included", variant: "success" };
    case "PAID_EXTRA":
    case "OPTIONAL":
      return { text: "Optional Paid Extra", variant: "warning" };
    case "UNCONFIRMED":
      return { text: "Unconfirmed", variant: "destructive" };
    case "EXCLUDED":
    default:
      return { text: "Not Included (Payable Separately)", variant: "outline" };
  }
}

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

  const hiddenPlaceCount = pkg.placeCount - pkg.places.length;

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

  const pickupMapsTarget = pkg.pickupMapsUrl
    ? pkg.pickupMapsUrl
    : pkg.pickupAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pkg.pickupAddress)}`
    : null;

  function priceSummary(place: (typeof pkg.places)[number]): string {
    const pricing = place.pricing ?? [];
    if (pricing.length > 0) {
      const adultDomestic = pricing.find(
        (band) => band.visitor === "DOMESTIC" && band.ageGroup.toLowerCase() === "adult"
      );
      const adultForeign = pricing.find(
        (band) => band.visitor === "FOREIGN" && band.ageGroup.toLowerCase() === "adult"
      );

      if (adultDomestic || adultForeign) {
        return [
          adultDomestic ? `Indian: ${formatCurrency(adultDomestic.amount)}` : "Indian: —",
          adultForeign ? `Foreign: ${formatCurrency(adultForeign.amount)}` : "Foreign: —",
        ].join(" · ");
      }

      const cheapest = Math.min(...pricing.map((band) => band.amount));
      return `From ${formatCurrency(cheapest)}`;
    }

    return place.entryfee === null || place.entryfee === undefined
      ? "Free entry"
      : formatCurrency(place.entryfee);
  }

  const isWholeTour = pkg.pricingMode === "WHOLE_TOUR";
  const displayPrice = isWholeTour ? pkg.price : person.cost;

  return (
    <div className="pb-8">
      {/* Banner if configured */}
      {person.agencyBanner ? (
        <div className="relative h-48 w-full overflow-hidden bg-muted sm:h-64 sm:rounded-3xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={person.agencyBanner}
            alt={person.agencyName ?? "Agency Cover"}
            className="size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 text-white sm:left-6 sm:right-6">
            {person.agencyName ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 px-2.5 py-1 text-xs font-semibold backdrop-blur-md">
                <Building2 className="size-3.5" />
                {person.agencyName}
              </span>
            ) : null}
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{pkg.name}</h1>
          </div>
        </div>
      ) : null}

      <ScreenHeader
        title={person.agencyBanner ? "" : pkg.name}
        subtitle={
          person.agencyName
            ? `${pkg.placeCount} stop${pkg.placeCount === 1 ? "" : "s"} · ${person.agencyName} with ${person.full_name}`
            : `${pkg.placeCount} stop${pkg.placeCount === 1 ? "" : "s"} · guided by ${person.full_name}`
        }
        backHref={`${districtBase}/guides/${person.id}`}
      />

      <div className="app-container space-y-8">
        {/* Guide & Agency Card */}
        <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <GuideAvatar
              name={person.full_name}
              image={person.profile_pic}
              className="size-14 shrink-0 ring-2 ring-primary/20"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold leading-tight">
                {person.agencyName ?? person.full_name}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {person.agencyName
                  ? `Tour led by ${person.full_name}${person.tagline ? ` · ${person.tagline}` : ""}`
                  : (person.tagline ?? "Local expert guide")}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {typeof person.rating === "number" && person.rating > 0 ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-500">
                    <Star className="size-3.5 fill-amber-400" />
                    {person.rating.toFixed(1)}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1">
                  <Award className="size-3.5" /> {person.experience} yrs exp
                </span>
                <span className="inline-flex items-center gap-1">
                  <Languages className="size-3.5" /> {person.language?.join(", ") ?? "English"}
                </span>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="shrink-0 rounded-xl">
              <Link href={`${districtBase}/guides/${person.id}`}>View guide</Link>
            </Button>
          </div>

          {pkg.description ? (
            <p className="text-[0.95rem] leading-relaxed text-foreground/90">
              {pkg.description}
            </p>
          ) : null}

          {/* Pricing & Key Metrics Badge */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge variant="success" className="gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold">
              <Route className="size-3.5" />
              {pkg.placeCount} stop{pkg.placeCount === 1 ? "" : "s"} included
            </Badge>

            <Badge variant="info" className="gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold">
              <Ticket className="size-3.5" />
              {formatCurrency(displayPrice)}{" "}
              {isWholeTour
                ? pkg.pricingUnit === "PER_PERSON"
                  ? "per person (whole tour)"
                  : "whole tour (flat rate)"
                : pkg.pricingUnit === "PER_PERSON"
                ? "per place / person"
                : "per place"}
            </Badge>

            {pkg.tripStartTime ? (
              <Badge variant="outline" className="gap-1 rounded-lg px-2.5 py-1 text-xs">
                <Clock className="size-3.5 text-primary" />
                Starts at {pkg.tripStartTime}
              </Badge>
            ) : null}
          </div>

          {hiddenPlaceCount > 0 ? (
            <p className="rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              {hiddenPlaceCount} more stop{hiddenPlaceCount === 1 ? "" : "s"} of
              this tour {hiddenPlaceCount === 1 ? "is" : "are"} in other
              districts. Booking from here covers the {pkg.places.length} below —
              message {person.full_name} to add the rest.
            </p>
          ) : null}

          {pkg.places.length > 0 ? (
            <Button
              variant="action"
              className="mt-2 w-full rounded-2xl py-6 text-base font-semibold shadow-md"
              onClick={() => setBookingOpen(true)}
            >
              Book this tour — {formatCurrency(displayPrice)}
            </Button>
          ) : null}
        </section>

        {/* Pickup Location & Google Maps */}
        {(pkg.pickupName || pkg.pickupAddress || pickupMapsTarget || pkg.tripStartTime) ? (
          <section>
            <SectionHeader
              title="Pickup & Departure Location"
              subtitle="Where you will meet your guide to start the tour"
            />
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  {pkg.pickupName ? (
                    <p className="font-semibold text-base flex items-center gap-2">
                      <MapPin className="size-4 text-primary shrink-0" />
                      {pkg.pickupName}
                    </p>
                  ) : null}
                  {pkg.pickupAddress ? (
                    <p className="text-sm text-muted-foreground">{pkg.pickupAddress}</p>
                  ) : null}
                  {pkg.tripStartTime ? (
                    <p className="text-xs font-medium text-primary flex items-center gap-1.5 pt-1">
                      <Clock className="size-3.5" /> Start Time: {pkg.tripStartTime}
                    </p>
                  ) : null}
                </div>

                {pickupMapsTarget ? (
                  <Button asChild variant="outline" size="sm" className="gap-1.5 rounded-xl shrink-0">
                    <a href={pickupMapsTarget} target="_blank" rel="noopener noreferrer">
                      <MapPin className="size-3.5 text-primary" />
                      Open Pickup Location
                      <ExternalLink className="size-3" />
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {/* Facilities & Disclosures */}
        <section>
          <SectionHeader
            title="Facilities & Inclusions"
            subtitle="What is covered in this tour package and what is payable separately"
          />
          <div className="grid gap-3 sm:grid-cols-3">
            {/* Food */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Utensils className="size-4 text-primary shrink-0" />
                Food & Meals
              </div>
              {(() => {
                const status = formatStatus(pkg.foodStatus);
                return <Badge variant={status.variant}>{status.text}</Badge>;
              })()}
              <p className="text-xs text-muted-foreground leading-relaxed">
                {pkg.foodDetails || "Details will be confirmed by guide upon booking."}
              </p>
            </div>

            {/* Transport */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Car className="size-4 text-primary shrink-0" />
                Transport & Transfer
              </div>
              {(() => {
                const status = formatStatus(pkg.transportStatus);
                return <Badge variant={status.variant}>{status.text}</Badge>;
              })()}
              <p className="text-xs text-muted-foreground leading-relaxed">
                {pkg.transportDetails || "Details will be confirmed by guide upon booking."}
              </p>
            </div>

            {/* Entry Fees */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Ticket className="size-4 text-primary shrink-0" />
                Monuments & Entry Fees
              </div>
              {(() => {
                const status = formatStatus(pkg.entryFeeStatus);
                return <Badge variant={status.variant}>{status.text}</Badge>;
              })()}
              <p className="text-xs text-muted-foreground leading-relaxed">
                {pkg.entryFeeDetails || "Entry tickets per place are listed below."}
              </p>
            </div>
          </div>

          {pkg.additionalCostsDetails ? (
            <div className="mt-3 rounded-2xl border border-border bg-muted/40 p-3.5 text-xs text-muted-foreground flex items-start gap-2">
              <Info className="size-4 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-foreground">Additional Cost Notes: </span>
                {pkg.additionalCostsDetails}
              </div>
            </div>
          ) : null}
        </section>

        {/* Places included in the tour */}
        <section>
          <SectionHeader
            title="Itinerary & Places Included"
            subtitle={
              hiddenPlaceCount > 0
                ? "Stops in this district included in the itinerary"
                : "All stops included in this tour"
            }
          />
          {pkg.places.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="No places listed"
              description="This tour does not cover any place in this district yet."
            />
          ) : (
            <div className="space-y-3">
              {pkg.places.map((place, index) => (
                <div key={place.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                  <Link
                    href={`${districtBase}/places/${place.id}`}
                    className="flex flex-col gap-3 p-3 sm:flex-row"
                  >
                    <div className="relative h-28 w-full overflow-hidden rounded-xl sm:w-36">
                      {place.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={place.images[0]}
                          alt={place.name}
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center bg-muted text-muted-foreground">
                          <MapPin className="size-4" />
                        </div>
                      )}
                      <span className="absolute top-2 left-2 flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-sm">
                        {index + 1}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-base">{place.name}</p>
                          <p className="text-xs text-muted-foreground">{place.districtName}</p>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {place.category || "Stop"}
                        </Badge>
                      </div>

                      {place.description ? (
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                          {place.description}
                        </p>
                      ) : null}

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                          <Ticket className="size-3.5" />
                          {priceSummary(place)}
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Cancellation Policy */}
        {pkg.cancellationPolicy ? (
          <section>
            <SectionHeader
              title="Cancellation & Booking Terms"
              subtitle="Terms set by the guide for this package"
            />
            <div className="rounded-2xl border border-border bg-card p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
                Cancellation Policy
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {pkg.cancellationPolicy}
              </p>
            </div>
          </section>
        ) : null}

        {/* Customer Reviews & Ratings */}
        {person.review && person.review.length > 0 ? (
          <section>
            <SectionHeader
              title="Customer Reviews & Ratings"
              subtitle={`Verified feedback from travellers guided by ${person.agencyName || person.full_name}`}
            />
            <div className="space-y-3">
              {person.review.map((rev, index) => (
                <div key={index} className="rounded-2xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="size-3.5 fill-amber-400" />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">Verified Traveller</span>
                  </div>
                  <p className="text-sm text-foreground/90">{rev}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

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

      <PackageBookingModal
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        pkg={pkg}
        districtId={districtId}
      />
    </div>
  );
}

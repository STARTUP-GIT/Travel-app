"use client";

import {
  ArrowLeft,
  Award,
  Baby,
  Building2,
  Calendar,
  Car,
  Check,
  Clock,
  ExternalLink,
  Info,
  Languages,
  MapPin,
  Route,
  ShieldCheck,
  Star,
  Ticket,
  UserCheck,
  Users,
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

            {pkg.duration ? (
              <Badge variant="outline" className="gap-1 rounded-lg px-2.5 py-1 text-xs">
                <Clock className="size-3.5 text-primary" />
                {pkg.duration}
              </Badge>
            ) : null}

            {pkg.maxGroupSize ? (
              <Badge variant="outline" className="gap-1 rounded-lg px-2.5 py-1 text-xs">
                <Users className="size-3.5 text-primary" />
                Max {pkg.maxGroupSize} guests
              </Badge>
            ) : null}

            {pkg.tripStartTime ? (
              <Badge variant="outline" className="gap-1 rounded-lg px-2.5 py-1 text-xs">
                <Clock className="size-3.5 text-primary" />
                Starts at {pkg.tripStartTime}
              </Badge>
            ) : null}

            {pkg.childrenAllowed ? (
              <Badge variant="outline" className="gap-1 rounded-lg px-2.5 py-1 text-xs">
                <Baby className="size-3.5 text-primary" />
                Children up to {pkg.childMaxAge || 12}y
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1 rounded-lg px-2.5 py-1 text-xs">
                <Baby className="size-3.5" />
                Adults only
              </Badge>
            )}
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

        {/* Facilities & Inclusions */}
        <section>
          <SectionHeader
            title="Facilities & Inclusions"
            subtitle="Transparent breakdown of meals, transport, and entry fee inclusions"
          />
          <div className="grid gap-3 sm:grid-cols-3">
            {/* Meals - Exactly 3 Service Options */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Utensils className="size-4 text-primary shrink-0" />
                Food & Meals
              </div>

              {pkg.mealsService === "INCLUDED" || (!pkg.mealsService && pkg.foodStatus === "INCLUDED") ? (
                <div className="space-y-2">
                  <Badge variant="success">Included in package</Badge>
                  {pkg.includedMeals && pkg.includedMeals.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {pkg.includedMeals.map((meal) => (
                        <span key={meal} className="rounded-md bg-primary/10 px-2 py-0.5 text-[0.7rem] font-semibold text-primary">
                          {meal}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {pkg.mealDetails || pkg.foodDetails || "Meals are provided and covered in the tour price."}
                  </p>
                </div>
              ) : pkg.mealsService === "ON_REQUEST" || (!pkg.mealsService && pkg.foodStatus === "OPTIONAL") ? (
                <div className="space-y-1.5">
                  <Badge variant="warning">Can be arranged if requested</Badge>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {pkg.mealDetails || pkg.foodDetails || "Not automatically included. Can be arranged upon request for an additional charge."}
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Badge variant="outline">No such service</Badge>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Meals are not provided or arranged through this package.
                  </p>
                </div>
              )}
            </div>

            {/* Transport - Exactly 3 Service Options */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Car className="size-4 text-primary shrink-0" />
                Transport & Transfer
              </div>

              {pkg.transportService === "INCLUDED" || (!pkg.transportService && pkg.transportStatus === "INCLUDED") ? (
                <div className="space-y-2">
                  <Badge variant="success">Included in package</Badge>
                  {Array.isArray(pkg.transportVehicles) && pkg.transportVehicles.length > 0 ? (
                    <div className="space-y-1.5">
                      {pkg.transportVehicles.map((v, i) => (
                        <div key={i} className="rounded-lg bg-muted/40 p-2 text-xs">
                          <p className="font-semibold text-foreground">
                            {v.type || (v as any).vehicleType} · {v.capacity} seats ({v.isPrivate !== false ? "Private" : "Shared"})
                          </p>
                          {v.chargesIncluded ? (
                            <p className="text-[0.65rem] text-emerald-600 font-medium">
                              ✓ {v.chargesIncluded}
                            </p>
                          ) : null}
                          {v.chargesExcluded || (v as any).additionalChargesExcluded ? (
                            <p className="text-[0.65rem] text-muted-foreground">
                              ✗ Excluded: {v.chargesExcluded || (v as any).additionalChargesExcluded}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {pkg.transportDetails || "Dedicated transportation is provided for this package."}
                  </p>
                </div>
              ) : pkg.transportService === "ON_REQUEST" || (!pkg.transportService && pkg.transportStatus === "OPTIONAL") ? (
                <div className="space-y-1.5">
                  <Badge variant="warning">Can be arranged if requested</Badge>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {pkg.transportDetails || "Not automatically included. Can be arranged upon request for an additional fee."}
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Badge variant="outline">No such service</Badge>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Transport is not provided. Travellers meet at the pickup point or travel independently.
                  </p>
                </div>
              )}
            </div>

            {/* Entry Fees - Exactly 2 Choices */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Ticket className="size-4 text-primary shrink-0" />
                Monuments & Entry Fees
              </div>

              {pkg.entryFeeStatus === "INCLUDED" ? (
                <div className="space-y-1.5">
                  <Badge variant="success">Included in package</Badge>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    All admission and monument entry fees are included in the tour price.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Badge variant="outline">Excluded (Paid separately)</Badge>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {pkg.entryFeeDetails || "Entry fees are payable separately by travellers at each monument."}
                  </p>
                </div>
              )}
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

        {/* Specific Guide Details Section */}
        {pkg.hasSpecificGuide && pkg.specificGuide ? (
          <section>
            <SectionHeader
              title="Included Specific Guide"
              subtitle="An expert local guide assigned to accompany you on this package"
            />
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                {pkg.specificGuide.profilePic ? (
                  <img
                    src={pkg.specificGuide.profilePic}
                    alt={pkg.specificGuide.name}
                    className="size-14 rounded-full object-cover shrink-0 ring-2 ring-primary/20"
                  />
                ) : (
                  <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary font-bold shrink-0">
                    {pkg.specificGuide.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-bold text-foreground truncate">{pkg.specificGuide.name}</p>
                    <Badge variant="success" className="text-[0.65rem] gap-1">
                      <UserCheck className="size-3" /> Included in Tour
                    </Badge>
                  </div>
                  {pkg.specificGuide.tagline ? (
                    <p className="text-xs text-muted-foreground italic truncate">
                      &ldquo;{pkg.specificGuide.tagline}&rdquo;
                    </p>
                  ) : null}
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 font-semibold text-primary">
                      <Award className="size-3.5" /> {pkg.specificGuide.experienceYears || 1}+ yrs experience
                    </span>
                    {pkg.specificGuide.languages && pkg.specificGuide.languages.length > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <Languages className="size-3.5" /> {pkg.specificGuide.languages.join(", ")}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section>
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-xs text-muted-foreground flex items-center gap-2.5">
              <UserCheck className="size-4 text-muted-foreground shrink-0" />
              <span>
                <strong>Tour Guide Service:</strong> This package is led directly by {person.agencyName || person.full_name}. No additional Specific Guide is assigned.
              </span>
            </div>
          </section>
        )}

        {/* Children & Family Rules Section */}
        <section>
          <SectionHeader
            title="Children & Age Policies"
            subtitle="Booking eligibility and policies for young travellers"
          />
          <div className="rounded-2xl border border-border bg-card p-4 space-y-2 text-xs">
            {pkg.childrenAllowed ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="success" className="gap-1">
                    <Baby className="size-3.5" /> Children Permitted
                  </Badge>
                  <span className="text-muted-foreground">
                    Child age band: <strong>Up to {pkg.childMaxAge || 12} years</strong>
                  </span>
                  {pkg.maxChildren ? (
                    <span className="text-muted-foreground">
                      · Max <strong>{pkg.maxChildren} children</strong> per group
                    </span>
                  ) : null}
                </div>
                {pkg.childPrice && pkg.childPrice > 0 ? (
                  <p className="text-foreground">
                    Child Price: <strong>{formatCurrency(pkg.childPrice)}</strong> per child
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    Standard child pricing applies.
                  </p>
                )}
                {pkg.childConditions ? (
                  <p className="text-muted-foreground leading-relaxed">
                    Note: {pkg.childConditions}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-destructive font-medium">
                <Baby className="size-4" />
                <span>Adults-Only Tour: Children are not permitted on this package.</span>
              </div>
            )}
          </div>
        </section>

        {/* Places included in the tour with Itinerary Arrangement */}
        <section>
          <SectionHeader
            title="Itinerary & Stops Arrangement"
            subtitle={
              hiddenPlaceCount > 0
                ? "Stops in this district included in the itinerary"
                : "Complete ordered itinerary with guided visit vs drop-off details"
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
                        <div className="flex items-center gap-1.5 shrink-0">
                          {place.visitArrangement === "DROP_OFF" ? (
                            <Badge variant="outline" className="text-[0.65rem] border-amber-500/30 text-amber-600 bg-amber-50/50">
                              Drop-off only (Self-guided)
                            </Badge>
                          ) : (
                            <Badge variant="success" className="text-[0.65rem]">
                              Guided Visit Included
                            </Badge>
                          )}
                          <Badge variant="outline" className="shrink-0 text-[0.65rem]">
                            {place.category || "Stop"}
                          </Badge>
                        </div>
                      </div>

                      {place.description ? (
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                          {place.description}
                        </p>
                      ) : null}

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {place.expectedDuration ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                            <Clock className="size-3.5 text-primary" />
                            Duration: {place.expectedDuration}
                          </span>
                        ) : null}

                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                          <Ticket className="size-3.5" />
                          {place.entryFeeStatus === "INCLUDED" ? (
                            <span className="text-emerald-600 font-medium">Entry ticket included in tour</span>
                          ) : place.entryFeeAmount && place.entryFeeAmount > 0 ? (
                            <span>Entry fee: {formatCurrency(place.entryFeeAmount)} (paid separately)</span>
                          ) : (
                            <span>{priceSummary(place)} (paid separately)</span>
                          )}
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

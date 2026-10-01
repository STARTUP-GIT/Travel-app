"use client";

import * as React from "react";
import { motion } from "motion/react";
import {
  ArrowRight,
  CarTaxiFront,
  Clock,
  Compass,
  Info,
  Map as MapIcon,
  Images,
  MessageSquareText,
  Package,
  Route,
  Ticket,
  UtensilsCrossed,
  Warehouse,
  Wifi,
  BadgeCheck,
  Coffee,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";

import { AppImage } from "@/components/shared/app-image";
import { FavoriteButton } from "@/components/shared/favorite-button";
import { SectionHeader } from "@/components/shared/section-header";
import { ServiceGrid, type ServiceItem } from "@/components/shared/service-card";
import { ScreenHeader } from "@/components/shared/screen-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageGallery } from "@/features/places/ui/image-gallery";
import { GuideCard } from "@/features/guides/ui/guide-card";
import type { GuideWithContext } from "@/features/guides/types";
import { MapEmbed } from "@/features/maps/ui/map-embed";
import { MapActionButtons } from "@/features/maps/ui/map-action-buttons";
import { ReviewsSection } from "@/features/reviews/ui/reviews";
import type { Place, PlacePricingBand } from "@/features/places/types";
import { formatCurrency } from "@/lib/utils";

export function PlaceView({
  place,
  districtSlug,
  stateSlug,
}: {
  place: Place;
  districtSlug: string;
  stateSlug?: string;
}) {
  const [service, setService] = React.useState<ServiceItem | null>(null);
  const districtBase = stateSlug ? `/${stateSlug}/${districtSlug}` : "/explore";

  const specificGuides: GuideWithContext[] = (place.specificguide ?? []).map((g) => ({
    type: "specific",
    guide: g,
    place: {
      id: place.id,
      name: place.name,
      slug: districtSlug,
      districtName: place.district?.name ?? "",
    },
  }));
  const commonGuides = (place.commonGuidePlaces ?? [])
    .map((link) => link.commonGuide)
    .filter((g): g is NonNullable<typeof g> => Boolean(g));

  // Only approved guides' packages reach this page — the backend filters them on
  // the way out — so a package listed here is always bookable.
  const packages = place.commonGuidePackages ?? [];

  /*
   * Per-band pricing, when the place has it.
   *
   * Bands are stored one row per (visitor, age group) but read better as one row
   * per age group with a column per visitor type, so they are pivoted here. The
   * bands themselves come from the same rows the guide entered and the admin panel
   * edits, so there is no second set of prices to drift.
   */
  const bands: PlacePricingBand[] = place.pricing ?? [];
  const hasPricingBands = bands.length > 0;

  const pricingRows = React.useMemo(() => {
    const byAge = new Map<string, { domestic: number | null; foreign: number | null }>();
    for (const band of bands) {
      const row = byAge.get(band.ageGroup) ?? { domestic: null, foreign: null };
      row[band.visitor === "DOMESTIC" ? "domestic" : "foreign"] = band.amount;
      byAge.set(band.ageGroup, row);
    }
    // Sorted so the table order is stable and predictable rather than whatever
    // order the database returned the rows in.
    return [...byAge.entries()]
      .map(([ageGroup, prices]) => ({ ageGroup, ...prices }))
      .sort((a, b) => a.ageGroup.localeCompare(b.ageGroup));
  }, [bands]);

  const services: ServiceItem[] = [
    {
      id: "restaurants",
      icon: UtensilsCrossed,
      title: "Restaurant",
      subtitle: "Dine near this place",
      href: `${districtBase}/restaurants`,
      accent: "green",
    },
    {
      id: "cafe",
      icon: Coffee,
      title: "Cafe",
      subtitle: "Coffee & quick bites",
      href: `${districtBase}/restaurants`,
      accent: "amber",
    },
    {
      id: "guides",
      icon: Compass,
      title: "Guide Service",
      subtitle: "Expert guides here",
      href: `${districtBase}/guides`,
      accent: "blue",
    },
    {
      id: "parking",
      icon: Warehouse,
      title: "Parking",
      subtitle: "Vehicle parking",
      accent: "blue",
    },
    {
      id: "restrooms",
      icon: Wifi,
      title: "Restrooms",
      subtitle: "Facilities",
      accent: "green",
      href: `${districtBase}/places`,
    },
    {
      id: "souvenirs",
      icon: ShoppingBag,
      title: "Souvenir Shop",
      subtitle: "Take home memories",
      accent: "rose",
    },
  ];

  function handleService(item: ServiceItem) {
    if (item.href) return;
    setService(item);
  }

  const address = placeLatLng(place);

  return (
    <div className="pb-6">
      <ScreenHeader title={place.name} subtitle="Place information" />

      {/* Hero image */}
      <div className="relative">
        <div className="-mx-4 overflow-hidden bg-blue-900 sm:rounded-b-[2rem]">
          <div className="relative aspect-[4/3] max-h-[24rem] w-full sm:aspect-[16/8]">
            <AppImage src={place.images?.[0]} alt={place.name} className="size-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/20" />
            <div className="absolute right-3 top-3">
              <FavoriteButton
                id={place.id}
                type="place"
                overlay
                name={place.name}
                image={place.images?.[0]}
                districtSlug={districtSlug}
              />
            </div>
          </div>
        </div>
        <div className="px-4 pt-4 sm:absolute sm:inset-x-0 sm:bottom-0 sm:px-5 sm:pb-4 sm:pt-0">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-primary sm:bg-white/20 sm:text-white sm:backdrop-blur-md">
                {place.category || "Place"}
              </span>
              <h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-white sm:drop-shadow-sm">
                {place.name}
              </h1>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-card px-3 py-2 text-sm font-bold ring-1 ring-border sm:bg-white/15 sm:text-white sm:ring-0 sm:backdrop-blur-md">
              <Ticket className="size-4 text-amber-500 sm:text-amber-300" />
              {headlinePrice(place)}
            </span>
          </div>
        </div>
      </div>

      {/* Primary actions */}
      <div className="app-container relative mt-4 grid grid-cols-2 gap-2 sm:mt-4 sm:z-auto sm:px-0 sm:pt-4">
        <Button
          asChild
          variant="action"
          size="lg"
          className="rounded-2xl shadow-float"
        >
          <Link href={`${districtBase}/places/${place.id}/go-to`}>
            <CarTaxiFront className="size-5" /> Go To
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="rounded-2xl bg-card">
          <Link href={`${districtBase}/guides`}>
            <Compass className="size-5" /> Book Guide
          </Link>
        </Button>
      </div>

      <div className="app-container mt-6">
        <Tabs defaultValue="info" className="w-full">
          {/*
            The shared Tabs primitive is a dark-glass control: it carries
            `text-muted-foreground`, and its active state pairs
            `bg-primary` with `text-primary-foreground`. This row paints a
            light `bg-muted` surface instead, so those inherited values left
            the icons unreadable — the active tab in particular rendered
            white text on a white `bg-card`. The trigger colours are pinned
            here rather than in the primitive, so every other Tabs on the site
            keeps its existing appearance.
          */}
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-2xl border border-border bg-muted p-1 sm:h-10 sm:grid-cols-4">
            {(
              [
                ["info", Info, "Info"],
                ["images", Images, "Images"],
                ["map", MapIcon, "Map"],
                ["reviews", MessageSquareText, "Reviews"],
              ] as const
            ).map(([value, Icon, label]) => (
              <TabsTrigger
                key={value}
                value={value}
                className="flex h-auto min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2 text-foreground/80 hover:bg-foreground/10 hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:h-8 sm:min-h-0 sm:px-3"
              >
                <Icon className="size-[18px] shrink-0 stroke-[2.25]" />
                <span>{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* INFO */}
          <TabsContent value="info" className="animate-fade-in pt-4">
            <div className="space-y-6">
              <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <SectionHeader title="About this place" />
                <p className="card-surface rounded-2xl p-4 text-[0.95rem] leading-relaxed text-foreground/90">
                  {place.description || "No description added yet. Please check back soon."}
                </p>
              </motion.section>

              <section>
                <SectionHeader title="Good to know" />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <InfoPill
                    icon={<Ticket className="size-4" />}
                    label={hasPricingBands ? "Entry from" : "Entry fee"}
                    value={headlinePrice(place)}
                  />
                  <InfoPill icon={<Compass className="size-4" />} label="Category" value={place.category || "—"} />
                  <InfoPill icon={<Clock className="size-4" />} label="Best time" value="Check locally" />
                </div>
              </section>

              {/*
                The full per-band table, only when the place actually has bands.
                Every other place — including every place created before bands
                existed — keeps the single "Entry fee" pill above and sees nothing
                here, rather than being shown an empty table.
              */}
              {hasPricingBands ? (
                <section aria-labelledby="pricing-label">
                  <SectionHeader
                    title="Entry pricing"
                    subtitle="Prices by age group and visitor type"
                  />
                  <div className="card-surface overflow-hidden rounded-2xl">
                    <table className="w-full text-sm">
                      <caption className="sr-only">
                        Entry prices for {place.name} by age group and visitor type
                      </caption>
                      <thead>
                        <tr className="border-b border-border bg-muted/50 text-left">
                          <th scope="col" className="px-4 py-2.5 font-semibold">
                            Age group
                          </th>
                          <th scope="col" className="px-4 py-2.5 text-right font-semibold">
                            Indian visitors
                          </th>
                          <th scope="col" className="px-4 py-2.5 text-right font-semibold">
                            Foreign visitors
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {pricingRows.map((row) => (
                          <tr key={row.ageGroup} className="border-b border-border/60 last:border-0">
                            <th
                              scope="row"
                              className="px-4 py-2.5 text-left font-medium"
                            >
                              {row.ageGroup}
                            </th>
                            <td className="px-4 py-2.5 text-right tabular-nums">
                              {row.domestic === null ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                formatCurrency(row.domestic)
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums">
                              {row.foreign === null ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                formatCurrency(row.foreign)
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 px-1 text-xs text-muted-foreground">
                    A dash means that visitor type is not charged separately for
                    that age group.
                  </p>
                </section>
              ) : null}

              {/* Services at place */}
              <section aria-labelledby="services-label">
                <SectionHeader
                  title="Services at this place"
                  subtitle="Things available around here"
                />
                <ServiceGrid items={services} onSelect={handleService} />
              </section>

              {/* Specific guides for this place */}
              {specificGuides.length > 0 ? (
                <section aria-labelledby="guides-label">
                  <SectionHeader
                    title="Guides for this place"
                    subtitle="Book directly with a local guide"
                    href={`${districtBase}/guides`}
                  />
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {specificGuides.map((guide) => (
                      <GuideCard
                      key={guide.guide.id}
                      guide={guide}
                      districtSlug={districtSlug}
                      stateSlug={stateSlug}
                      showFavorite
                    />
                    ))}
                  </div>
                </section>
              ) : null}

              {/* Tour packages that include this place */}
              {packages.length > 0 ? (
                <section aria-labelledby="packages-label">
                  <SectionHeader
                    title="Tours including this place"
                    subtitle="Multi-stop tours you can book from here"
                    href={`${districtBase}/guides`}
                  />
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {packages.map((pkg) => (
                      <Link
                        key={pkg.id}
                        href={`${districtBase}/guides/${pkg.commonGuideId}/packages/${pkg.id}`}
                        className="card-surface flex items-center gap-3 rounded-2xl p-4 transition-colors hover:bg-accent"
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Route className="size-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">
                            {pkg.name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {pkg.description ?? "Multi-stop guided tour"}
                          </span>
                        </span>
                        <ArrowRight className="size-4 shrink-0 text-primary" />
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}

              {/* Common guides covering this place */}
              {commonGuides.length > 0 ? (
                <section aria-labelledby="common-guides-label">
                  <SectionHeader
                    title="Common guides covering this place"
                    subtitle="Guides who can take you to several places"
                    href={`${districtBase}/guides`}
                  />
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {commonGuides.map((g) => (
                      <GuideCard
                        key={g.id}
                        guide={{ type: "common", guide: g, places: [], packages: [] }}
                        districtSlug={districtSlug}
                        stateSlug={stateSlug}
                        showFavorite
                      />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </TabsContent>

          {/* IMAGES */}
          <TabsContent value="images" className="animate-fade-in pt-4">
            <ImageGallery images={place.images ?? []} name={place.name} />
          </TabsContent>

          {/* MAP */}
          <TabsContent value="map" className="animate-fade-in pt-4">
            <div className="space-y-4">
              <MapEmbed point={place} label={place.name} height={300} />
              <div className="card-surface flex items-center gap-3 rounded-2xl p-4">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MapIcon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{place.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {place.district?.name ?? "Karnataka"}
                    {address ? ` · ${address}` : ""}
                  </p>
                </div>
              </div>
              <MapActionButtons point={place} label={place.name} />
            </div>
          </TabsContent>

          {/* REVIEWS */}
          <TabsContent value="reviews" className="animate-fade-in pt-4">
            <ReviewsSection
              target={{
                rating: undefined,
                ratingCount: undefined,
                distribution: null,
                published: [],
              }}
              targetId={place.id}
              targetType="place"
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Service info dialog */}
      <Dialog open={!!service} onOpenChange={(o) => !o && setService(null)}>
        <DialogContent className="max-w-sm rounded-3xl">
          {service ? (
            <>
              <DialogHeader>
                <span className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <service.icon className="size-6" />
                </span>
                <DialogTitle>{service.title} at this place</DialogTitle>
                <DialogDescription>
                  {service.title} availability near {place.name} is not listed yet.{" "}
                  {service.title === "Parking" || service.title === "Restrooms" || service.title === "Souvenir Shop"
                    ? "Once this service is enabled for the district, it will appear here."
                    : "Please check the district listings for options."}
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setService(null)}>
                  Got it
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card-surface flex flex-col gap-1.5 rounded-2xl p-3.5">
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

/**
 * The one price shown where there is only room for a single figure: the cheapest
 * band when the place has several, otherwise the flat fee, otherwise "Free".
 *
 * Falls back to the flat `entryfee` rather than treating an empty band list as
 * free, because that is what every place without bands — including every place
 * created before bands existed — actually means.
 */
function headlinePrice(place: Place): string {
  const bands = place.pricing ?? [];
  if (bands.length > 0) {
    return `From ${formatCurrency(Math.min(...bands.map((band) => band.amount)))}`;
  }
  return place.entryfee === null ? "Free" : formatCurrency(place.entryfee);
}

function placeLatLng(place: Place): string | null {
  if (
    typeof place.latitude !== "number" ||
    typeof place.longitude !== "number" ||
    (place.latitude === 0 && place.longitude === 0)
  ) {
    return null;
  }
  return `${place.latitude.toFixed(4)}, ${place.longitude.toFixed(4)}`;
}
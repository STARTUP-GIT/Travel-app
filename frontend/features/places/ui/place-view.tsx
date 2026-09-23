"use client";

import * as React from "react";
import { motion } from "motion/react";
import {
  CarTaxiFront,
  Clock,
  Compass,
  Info,
  Map as MapIcon,
  Images,
  MessageSquareText,
  Package,
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
import type { Place } from "@/features/places/types";
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
  const districtBase = stateSlug ? `/${stateSlug}/${districtSlug}` : `/${districtSlug}`;

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
      <div className="relative -mx-4 overflow-hidden bg-blue-900 sm:rounded-b-[2rem]">
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
          <div className="absolute bottom-0 inset-x-0 flex items-end justify-between gap-3 px-5 pb-4">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-white backdrop-blur-md">
                {place.category || "Place"}
              </span>
              <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white drop-shadow-sm">
                {place.name}
              </h1>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-sm font-bold text-white backdrop-blur-md">
              <Ticket className="size-4 text-amber-300" />
              {formatCurrency(place.entryfee)}
            </span>
          </div>
        </div>
      </div>

      {/* Primary actions */}
      <div className="app-container -mt-5 relative z-10 grid grid-cols-2 gap-2 sm:mt-4 sm:z-auto sm:px-0 sm:pt-4">
        <Button
          asChild
          variant="action"
          size="lg"
          className="rounded-2xl shadow-float"
        >
          <Link href={`${districtBase}/places/${place.id}/transport`}>
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
          <TabsList className="grid w-full grid-cols-4 rounded-2xl bg-muted p-1">
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
                className="flex items-center gap-1.5 rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{label}</span>
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
                  <InfoPill icon={<Ticket className="size-4" />} label="Entry fee" value={formatCurrency(place.entryfee)} />
                  <InfoPill icon={<Compass className="size-4" />} label="Category" value={place.category || "—"} />
                  <InfoPill icon={<Clock className="size-4" />} label="Best time" value="Check locally" />
                </div>
              </section>

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
                    href={`/${districtSlug}/guides`}
                  />
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {specificGuides.map((guide) => (
                      <GuideCard key={guide.guide.id} guide={guide} districtSlug={districtSlug} showFavorite />
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
                    href={`/${districtSlug}/guides`}
                  />
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {commonGuides.map((g) => (
                      <GuideCard
                        key={g.id}
                        guide={{ type: "common", guide: g, places: [] }}
                        districtSlug={districtSlug}
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
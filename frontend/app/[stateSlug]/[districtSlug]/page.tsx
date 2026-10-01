import { notFound } from "next/navigation";
import {
  Bookmark,
  CarTaxiFront,
  Footprints,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { SectionHeader } from "@/components/shared/section-header";
import { ServiceGrid, type ServiceItem } from "@/components/shared/service-card";
import { loadDistrictContent } from "@/features/locations/api/destination.api";
import {
  getDistricts,
  getStates,
} from "@/features/locations/api/locations.api";
import { slugify } from "@/features/locations/utils/slug";
import { PlaceCard } from "@/features/places/ui/place-card";
import { HotelCard } from "@/features/hotels/ui/hotel-card";
import { RestaurantCard } from "@/features/restaurants/ui/restaurant-card";
import {
  DistrictCommonGuides,
  DistrictCommonGuidesFallback,
} from "@/features/guides/ui/district-common-guides";

import { DistrictHero } from "./district-hero";

type DistrictPageProps = {
  params: Promise<{ stateSlug: string; districtSlug: string }>;
};

function firstImage(images: unknown): string | null {
  if (!Array.isArray(images)) return null;
  const image = images.find(
    (candidate): candidate is string =>
      typeof candidate === "string" && candidate.trim().length > 0
  );
  return image?.trim() ?? null;
}

export default async function DistrictPage({ params }: DistrictPageProps) {
  const { stateSlug, districtSlug } = await params;
  const normalizedStateSlug = slugify(stateSlug);
  const normalizedDistrictSlug = slugify(districtSlug);

  if (!normalizedStateSlug || !normalizedDistrictSlug) notFound();

  const [states, districts] = await Promise.all([getStates(), getDistricts()]);
  const state = states.find((item) => item.slug === normalizedStateSlug);

  if (!state || !state.isServiceAvailable) notFound();

  const district = districts.find(
    (item) =>
      item.slug === normalizedDistrictSlug &&
      item.stateId === state.id &&
      item.isServiceAvailable
  );

  if (!district) notFound();

  const { places, hotels, restaurants, loadErrors } =
    await loadDistrictContent(district);
  const base = `/${state.slug}/${district.slug}`;
  const heroImage =
    firstImage(places.flatMap((place) => place.images)) ||
    firstImage(hotels.flatMap((hotel) => hotel.images)) ||
    firstImage(restaurants.flatMap((restaurant) => restaurant.images)) ||
    (typeof state.primaryImage === "string" && state.primaryImage.trim()) ||
    null;
  const services: ServiceItem[] = [
    {
      id: "path-tracker",
      icon: CarTaxiFront,
      title: "Path Tracker",
      subtitle: "Track your route & distance",
      href: `${base}/path-tracker`,
      accent: "green",
    },
    {
      id: "saved",
      icon: Bookmark,
      title: "Saved",
      subtitle: "Your saved places & guides",
      href: "/favorites",
      accent: "rose",
    },
    {
      id: "bookings",
      icon: Footprints,
      title: "Bookings",
      subtitle: "Guides, stays & reservations",
      href: "/bookings",
      accent: "blue",
    },
  ];

  return (
    <div className="pb-6 pt-3 sm:pt-4">
      <DistrictHero
        stateName={state.name}
        stateSlug={state.slug}
        districtName={district.name}
        districtSlug={district.slug}
        stateImage={heroImage}
        description={`Explore ${district.name}, ${state.name} — heritage, culture, places and experiences for your journey.`}
      />

      <div className="mx-auto mt-5 w-full max-w-5xl space-y-6 px-4 sm:mt-6 sm:px-0">
        <section aria-labelledby="services-heading">
          <SectionHeader title="Explore & services" subtitle="What would you like to do?" />
          <ServiceGrid items={services} />
        </section>

        <section className="rounded-2xl bg-emerald-600 px-4 py-4 text-white shadow-card sm:px-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-white/80">Path Tracker</p>
              <h2 className="mt-1 text-base font-bold">Track your route, distance &amp; time</h2>
              <p className="mt-1 max-w-md text-xs leading-relaxed text-white/85">Plan a walking route and follow it live with GPS, distance, speed and a full trip report when you finish.</p>
              <Link href={`${base}/path-tracker`} className="mt-3 inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-emerald-700">Start a trip <span className="ml-2">-&gt;</span></Link>
            </div>
            <CarTaxiFront className="size-12 shrink-0 text-white/20" />
          </div>
        </section>

        <section aria-labelledby="places-heading" className="scroll-mt-28">
          <SectionHeader title="Popular destinations" subtitle={`Pick a destination in ${district.name} to begin`} href={`${base}/places`} />
          {places.length > 0 ? (
            <div className="scroll-row -mx-4 px-4 pb-1 sm:mx-0 sm:px-0">
              {places.slice(0, 8).map((place) => <PlaceCard key={place.id} place={place} districtSlug={district.slug} stateSlug={state.slug} horizontal showFavorite />)}
            </div>
          ) : <p className="py-4 text-sm text-muted-foreground">No approved destinations are published for {district.name} yet.</p>}
        </section>

        {/*
          Common Guide tour packages. Suspended rather than awaited with the rest
          of the page: these resolve through the district's place details, so the
          destinations, stays and dining sections above and below render without
          waiting on them, and a failure stays contained to this section.
        */}
        <Suspense fallback={<DistrictCommonGuidesFallback />}>
          <DistrictCommonGuides
            districtId={district.id}
            districtSlug={district.slug}
            stateSlug={state.slug}
          />
        </Suspense>

        <section aria-labelledby="stays-heading">
          <SectionHeader title="Hotels & stays" subtitle={`Hotels in ${district.name}`} href={`${base}/hotels`} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{hotels.slice(0, 6).map((hotel) => <HotelCard key={hotel.id} hotel={hotel} districtSlug={district.slug} stateSlug={state.slug} />)}</div>
        </section>

        <section aria-labelledby="dine-heading">
          <SectionHeader title="Restaurants" subtitle={`Restaurants in ${district.name}`} href={`${base}/restaurants`} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{restaurants.slice(0, 6).map((restaurant) => <RestaurantCard key={restaurant.id} restaurant={restaurant} districtSlug={district.slug} stateSlug={state.slug} />)}</div>
        </section>
      </div>
    </div>
  );
}
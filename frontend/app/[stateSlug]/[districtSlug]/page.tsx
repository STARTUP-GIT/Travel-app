import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Bookmark,
  CarTaxiFront,
  Compass,
  FilePen,
  Footprints,
  Hotel,
  MapPin,
  Smartphone,
  Soup,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { ScreenHeader } from "@/components/shared/screen-header";
import { SectionHeader } from "@/components/shared/section-header";
import { ServiceGrid, type ServiceItem } from "@/components/shared/service-card";
import { AppImage } from "@/components/shared/app-image";
import { DistrictSearchForm } from "@/components/shared/district-search-form";
import { MediaRowCard } from "@/components/shared/media-row-card";
import { DestinationLink } from "@/components/shared/destination-link";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { PlaceCard } from "@/features/places/ui/place-card";
import { loadDistrictContent } from "@/features/locations/api/destination.api";
import {
  getSiblingDistricts,
  resolveStateDistrict,
  tryStateDistrict,
} from "@/features/locations/server";
import { formatCurrency } from "@/lib/utils";
import { DistrictUnavailable } from "@/components/shared/district-unavailable";

type RouteParams = { stateSlug: string; districtSlug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { stateSlug, districtSlug } = await params;
  const resolved = await tryStateDistrict(stateSlug, districtSlug);
  if (!resolved) return { title: "District" };

  const { state, district } = resolved;
  return {
    title: `${district.name} · Famous Places & Guides`,
    description: `Discover the famous places, expert guides, hotels and restaurants of ${district.name}, ${state.name}.`,
  };
}

/**
 * /{stateSlug}/{districtSlug}
 *
 * The state and the district are both resolved from the URL, and the district is
 * only ever looked up inside the resolved state. Content comes from the backend
 * already restricted to APPROVED rows inside enabled districts, and is filtered
 * again on `districtId` here, so a page can only ever show its own district.
 */
export default async function DistrictPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { stateSlug, districtSlug } = await params;

  const resolution = await resolveStateDistrict(stateSlug, districtSlug);
  if (resolution.status === "error") {
    return <DistrictUnavailable message={resolution.message} />;
  }
  if (resolution.status === "missing") notFound();
  const { state, district } = resolution;

  const [content, siblings] = await Promise.all([
    loadDistrictContent(district),
    getSiblingDistricts(state.slug, district.id),
  ]);

  const { places, hotels, restaurants, loadErrors } = content;
  const base = `/${state.slug}/${district.slug}`;

  // The state's own image, straight from the state record.
  const heroImage = state.primaryImage ?? null;

  const services: ServiceItem[] = [
    {
      id: "guides",
      icon: Compass,
      title: "Guides",
      subtitle: "Local experts & storytellers",
      href: `${base}/guides`,
      accent: "amber",
    },
    {
      id: "hotels",
      icon: Hotel,
      title: "Hotels",
      subtitle: `${hotels.length} stays in ${district.name}`,
      href: `${base}/hotels`,
      accent: "blue",
    },
    {
      id: "restaurants",
      icon: Soup,
      title: "Restaurants",
      subtitle: `${restaurants.length} places to eat`,
      href: `${base}/restaurants`,
      accent: "green",
    },
    {
      id: "path-tracker",
      icon: CarTaxiFront,
      title: "Path Tracker",
      subtitle: "Plan & follow a route here",
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
    {
      id: "report",
      icon: FilePen,
      title: "Report Issue",
      subtitle: "Help us improve the app",
      href: "/report",
      accent: "amber",
    },
    {
      id: "about",
      icon: Smartphone,
      title: "About App",
      subtitle: "Version, terms & contact",
      href: "/about",
      accent: "blue",
    },
  ];

  const contentError =
    loadErrors.places ?? loadErrors.hotels ?? loadErrors.restaurants ?? null;

  return (
    <div className="pb-6">
      <ScreenHeader title={district.name} subtitle={`${state.name} · District`} />

      {/* Hero — the selected state's image from the database */}
      <section className="relative -mx-4 overflow-hidden px-5 pb-7 pt-6 text-white sm:mx-4 sm:mt-4 sm:rounded-3xl">
        {heroImage ? (
          <AppImage
            src={heroImage}
            alt={`${state.name} — ${district.name}`}
            className="absolute inset-0"
            fallbackClassName="absolute inset-0 bg-gradient-to-br from-blue-800 via-primary to-indigo-800"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-800 via-primary to-indigo-800" />
        )}
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/25 to-black/60"
          aria-hidden
        />

        <div className="relative">
          <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wider backdrop-blur-md">
            <Sparkles className="size-3.5 text-amber-200" />
            {state.name} · {district.name}
          </div>
          <h1 className="text-[1.9rem] font-bold leading-tight tracking-tight">
            Welcome to {district.name}
          </h1>
          <p className="mt-1 text-sm font-medium text-white/80">
            {state.name} · India
          </p>
          <p className="mt-1.5 line-clamp-2 max-w-xl text-sm text-white/90">
            Explore {places.length} famous places, {hotels.length} stays and{" "}
            {restaurants.length} restaurants — with local guides ready to make
            your visit memorable.
          </p>

          <DistrictSearchForm stateSlug={state.slug} districtSlug={district.slug} />

          <div className="mt-4 flex flex-wrap gap-2">
            <StatPill label={`${places.length} places`} />
            <StatPill label={`${hotels.length} hotels`} />
            <StatPill label={`${restaurants.length} restaurants`} />
          </div>
        </div>
      </section>

      <div className="app-container mt-7 space-y-8">
        {contentError ? (
          <ErrorState
            title="Some listings couldn't load"
            description={`${contentError} Everything else on this page is up to date.`}
          />
        ) : null}

        {/* Approved places of this district */}
        <section aria-labelledby="places-heading" className="scroll-mt-28">
          <SectionHeader
            title={`Places in ${district.name}`}
            subtitle="Famous places to visit"
            href={`${base}/places`}
          />
          {loadErrors.places ? (
            <ErrorState
              title="Couldn't load places"
              description={loadErrors.places}
            />
          ) : places.length === 0 ? (
            <EmptyState
              title="No places published yet"
              description={`There are no approved places for ${district.name} right now. Check back soon!`}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {places.slice(0, 9).map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  districtSlug={district.slug}
                  stateSlug={state.slug}
                  showFavorite
                />
              ))}
            </div>
          )}
        </section>

        {/* District services */}
        <section aria-labelledby="services-heading">
          <SectionHeader
            title="Explore & services"
            subtitle="Everything you need for the trip"
          />
          <ServiceGrid items={services} />
        </section>

        {/* Approved hotels of this district */}
        <section aria-labelledby="stays-heading">
          <SectionHeader
            title="Where to stay"
            subtitle={`Hotels in ${district.name}`}
            href={`${base}/hotels`}
          />
          {loadErrors.hotels ? (
            <ErrorState
              title="Couldn't load hotels"
              description={loadErrors.hotels}
            />
          ) : hotels.length === 0 ? (
            <EmptyState
              icon={Hotel}
              title="No hotels published yet"
              description={`There are no approved hotels in ${district.name} right now. Check back soon!`}
            />
          ) : (
            <div className="scroll-row -mx-4 px-4 pb-1 lg:mx-0 lg:px-0">
              {hotels.slice(0, 6).map((hotel) => (
                <MediaRowCard
                  key={hotel.id}
                  href={`${base}/hotels/${hotel.id}`}
                  image={hotel.images?.[0] ?? hotel.profile_logo}
                  title={hotel.name}
                  subtitle={hotel.address}
                  rating={hotel.rating}
                  ratingCount={hotel.review?.length}
                  meta={`${formatCurrency(hotel.cost_per_night)}/night`}
                />
              ))}
            </div>
          )}
        </section>

        {/* Approved restaurants of this district */}
        <section aria-labelledby="dine-heading">
          <SectionHeader
            title="Where to dine"
            subtitle={`Restaurants in ${district.name}`}
            href={`${base}/restaurants`}
          />
          {loadErrors.restaurants ? (
            <ErrorState
              title="Couldn't load restaurants"
              description={loadErrors.restaurants}
            />
          ) : restaurants.length === 0 ? (
            <EmptyState
              icon={Soup}
              title="No restaurants published yet"
              description={`There are no approved restaurants in ${district.name} right now. Check back soon!`}
            />
          ) : (
            <div className="scroll-row -mx-4 px-4 pb-1 lg:mx-0 lg:px-0">
              {restaurants.slice(0, 6).map((restaurant) => (
                <MediaRowCard
                  key={restaurant.id}
                  href={`${base}/restaurants/${restaurant.id}`}
                  image={restaurant.images?.[0] ?? restaurant.profile_logo}
                  title={restaurant.name}
                  subtitle={restaurant.address}
                  rating={restaurant.rating}
                  ratingCount={restaurant.review?.length}
                  badge={
                    restaurant.food_category === "PUREVEG"
                      ? "Veg"
                      : restaurant.food_category === "NONVEG"
                        ? "Non-veg"
                        : "Veg & Non-veg"
                  }
                />
              ))}
            </div>
          )}
        </section>

        {/* Other districts of the same state */}
        <section aria-labelledby="more-heading">
          <SectionHeader
            title={`More of ${state.name}`}
            subtitle="Explore other districts"
            href="/explore"
          />
          <Link
            href="/explore"
            className="group flex items-center justify-between rounded-2xl border border-border bg-card p-4 text-sm font-semibold transition-colors hover:bg-accent/50"
          >
            <span>Choose another state or district</span>
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          {siblings.length > 0 ? (
            <div className="mt-3 scroll-row -mx-4 px-4 pb-1 lg:mx-0 lg:px-0">
              {siblings.slice(0, 8).map((item) => (
                <DestinationLink
                  key={item.id}
                  stateSlug={state.slug}
                  districtSlug={item.slug}
                  href={`/${state.slug}/${item.slug}`}
                  className="card-surface card-surface-hover flex w-28 flex-col items-center gap-1 rounded-2xl p-3 text-center"
                >
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <MapPin className="size-5" />
                  </span>
                  <span className="line-clamp-2 text-xs font-semibold leading-tight">
                    {item.name}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[0.65rem] text-primary">
                    Visit <ArrowRight className="size-3" />
                  </span>
                </DestinationLink>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function StatPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-xs font-medium backdrop-blur-md">
      <MapPin className="size-3.5 text-amber-200" />
      {label}
    </span>
  );
}

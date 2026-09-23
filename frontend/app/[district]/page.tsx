import type { Metadata } from "next";
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
import { redirect } from "next/navigation";

import { ScreenHeader } from "@/components/shared/screen-header";
import { SectionHeader } from "@/components/shared/section-header";
import { ServiceGrid, type ServiceItem } from "@/components/shared/service-card";
import { AppImage } from "@/components/shared/app-image";
import { DistrictSearchForm } from "@/components/shared/district-search-form";
import { MediaRowCard } from "@/components/shared/media-row-card";
import { DestinationLink } from "@/components/shared/destination-link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/states";
import { PlaceCard } from "@/features/places/ui/place-card";
import { getPlacesByDistrict } from "@/features/places/api/places.api";
import { getHotelsForDistrict } from "@/features/hotels/api/hotels.api";
import { getRestaurantsForDistrict } from "@/features/restaurants/api/restaurants.api";
import { getDistricts } from "@/features/locations/api/locations.api";
import { slugify } from "@/features/locations/utils/slug";
import { requireDistrict } from "@/features/locations/server";
import { formatCurrency } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ district: string }>;
}): Promise<Metadata> {
  const { district: slug } = await params;
  try {
    const district = await requireDistrict(slug);
    return {
      title: `${district.name} · Famous Places & Guides`,
      description: `Discover the famous places, expert guides, hotels and restaurants of ${district.name}, ${district.state?.name ?? "India"}.`,
    };
  } catch {
    return { title: "District" };
  }
}

export default async function DistrictPage({
  params,
}: {
  params: Promise<{ district: string }>;
}) {
  const { district: slug } = await params;
  const district = await requireDistrict(slug);
  const stateSlug = slugify(district.state?.name ?? "india");

  redirect(`/${stateSlug}/${district.slug}`);

  const [places, hotels, restaurants, districts] = await Promise.all([
    getPlacesByDistrict(district.id).catch(() => []),
    getHotelsForDistrict(district.id).catch(() => []),
    getRestaurantsForDistrict(district.id).catch(() => []),
    getDistricts().catch(() => []),
  ]);

  const stateName = district.state?.name ?? "India";

  // "More districts" is kept scoped to the selected state only, matching the
  // state → district selection flow of the whole app.
  const moreDistricts = districts.filter((d) => d.stateId === district.stateId);

  // Admin-selected state image drives the hero; falls back to a district
  // representative image (first place) so the transition away from the
  // generic landing slideshow always feels intentional.
  const heroImage =
    district.state?.primaryImage ??
    (places[0]?.images?.[0] as string | undefined) ??
    null;

  const services: ServiceItem[] = [
    {
      id: "guides",
      icon: Compass,
      title: "Guides",
      subtitle: "Local experts & storytellers",
      href: `/${slug}/guides`,
      accent: "amber",
    },
    {
      id: "hotels",
      icon: Hotel,
      title: "Hotels",
      subtitle: `${hotels.length} stays in ${district.name}`,
      href: `/${slug}/hotels`,
      accent: "blue",
    },
    {
      id: "restaurants",
      icon: Soup,
      title: "Restaurants",
      subtitle: `${restaurants.length} places to eat`,
      href: `/${slug}/restaurants`,
      accent: "green",
    },
    {
      id: "path-tracker",
      icon: CarTaxiFront,
      title: "Path Tracker",
      subtitle: "Plan & follow a route here",
      href: `/${slug}/path-tracker`,
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

  return (
    <div className="pb-6">
      <ScreenHeader
        title={district.name}
        subtitle={`${stateName} · District`}
      />

      {/* Hero — state-specific image behind the welcome area */}
      <section className="relative -mx-4 overflow-hidden px-5 pb-7 pt-6 text-white sm:mx-4 sm:mt-4 sm:rounded-3xl">
        {heroImage ? (
          <AppImage
            src={heroImage}
            alt={`${district.name}, ${stateName}`}
            className="absolute inset-0"
            fallbackClassName="absolute inset-0 bg-gradient-to-br from-blue-800 via-primary to-indigo-800"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-800 via-primary to-indigo-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/25 to-black/60" aria-hidden />

        <div className="relative">
          <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wider backdrop-blur-md">
            <Sparkles className="size-3.5 text-amber-200" />
            Welcome to {district.name}
          </div>
          <h1 className="text-[1.9rem] font-bold leading-tight tracking-tight">
            {district.name}
          </h1>
          <p className="mt-1 line-clamp-2 max-w-xl text-sm text-white/90">
            Explore {places.length} famous places, {hotels.length} stays and{" "}
            {restaurants.length} restaurants — with local guides ready to make
            your visit memorable.
          </p>

          <DistrictSearchForm stateSlug={stateSlug} districtSlug={slug} />

          <div className="mt-4 flex flex-wrap gap-2">
            <StatPill label={`${places.length} places`} />
            <StatPill label={`${hotels.length} hotels`} />
            <StatPill label={`${restaurants.length} restaurants`} />
          </div>
        </div>
      </section>

      <div className="app-container mt-7 space-y-8">
        {/* Famous places */}
        <section id="famous-places" aria-labelledby="famous-heading" className="scroll-mt-28">
          <SectionHeader
            title={`Places in ${district.name}`}
            subtitle="Famous places to visit"
            href={`/${slug}/places`}
          />
          {places.length === 0 ? (
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
                  districtSlug={slug}
                  showFavorite
                />
              ))}
            </div>
          )}
        </section>

        {/* Services */}
        <section aria-labelledby="district-services-heading">
          <SectionHeader
            title="Explore & services"
            subtitle="Everything you need for the trip"
          />
          <ServiceGrid items={services} />
        </section>

        {/* Where to stay */}
        <section aria-labelledby="stays-heading">
          <SectionHeader
            title="Where to stay"
            subtitle="Hotels across the district"
            href={`/${slug}/hotels`}
          />
          {hotels.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No hotels listed yet.
            </p>
          ) : (
            <div className="scroll-row -mx-4 px-4 pb-1 lg:mx-0 lg:px-0">
              {hotels.slice(0, 6).map((hotel) => (
                <MediaRowCard
                  key={hotel.id}
                  href={`/${slug}/hotels/${hotel.id}`}
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

        {/* Where to dine */}
        <section aria-labelledby="dine-heading">
          <SectionHeader
            title="Where to dine"
            subtitle="Restaurants & cafés"
            href={`/${slug}/restaurants`}
          />
          {restaurants.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No restaurants listed yet.
            </p>
          ) : (
            <div className="scroll-row -mx-4 px-4 pb-1 lg:mx-0 lg:px-0">
              {restaurants.slice(0, 6).map((restaurant) => (
                <MediaRowCard
                  key={restaurant.id}
                  href={`/${slug}/restaurants/${restaurant.id}`}
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

        {/* More districts */}
        <section aria-labelledby="more-heading">
          <SectionHeader
            title={`More of ${stateName}`}
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
          {moreDistricts.length > 0 ? (
            <div className="mt-3 scroll-row -mx-4 px-4 pb-1 lg:mx-0 lg:px-0">
              {moreDistricts.slice(0, 8).map((d) => (
                <DestinationLink
                  key={d.id}
                  stateSlug={slugify(d.state?.name ?? "india")}
                  districtSlug={d.slug}
                  href={`/${d.slug}`}
                  className="card-surface card-surface-hover flex w-28 flex-col items-center gap-1 rounded-2xl p-3 text-center"
                >
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <MapPin className="size-5" />
                  </span>
                  <span className="line-clamp-2 text-xs font-semibold leading-tight">{d.name}</span>
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
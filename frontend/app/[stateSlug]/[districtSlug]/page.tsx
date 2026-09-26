import { notFound } from "next/navigation";
import {
  Bookmark,
  CarTaxiFront,
  Compass,
  FilePen,
  Footprints,
  Hotel,
  MapPin,
  Smartphone,
  Soup,
} from "lucide-react";
import Link from "next/link";

import { DestinationLink } from "@/components/shared/destination-link";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { MediaRowCard } from "@/components/shared/media-row-card";
import { SectionHeader } from "@/components/shared/section-header";
import { ServiceGrid, type ServiceItem } from "@/components/shared/service-card";
import { loadDistrictContent } from "@/features/locations/api/destination.api";
import {
  getDistricts,
  getStates,
} from "@/features/locations/api/locations.api";
import { slugify } from "@/features/locations/utils/slug";
import { PlaceCard } from "@/features/places/ui/place-card";
import { formatCurrency } from "@/lib/utils";

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
    (typeof state.primaryImage === "string" && state.primaryImage.trim()) ||
    firstImage(places.flatMap((place) => place.images)) ||
    firstImage(hotels.flatMap((hotel) => hotel.images)) ||
    firstImage(restaurants.flatMap((restaurant) => restaurant.images)) ||
    null;
  const siblings = districts.filter(
    (item) => item.stateId === state.id && item.id !== district.id
  );

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

  return (
    <div className="pb-6">
      <DistrictHero
        stateName={state.name}
        stateSlug={state.slug}
        districtName={district.name}
        districtSlug={district.slug}
        stateImage={heroImage}
        placeCount={places.length}
        hotelCount={hotels.length}
        restaurantCount={restaurants.length}
      />

      <div className="app-container mt-7 space-y-8">
        <section aria-labelledby="district-info-heading">
          <SectionHeader
            title={`${district.name}, ${state.name}`}
            subtitle="District information"
          />
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Explore approved places, hotels and restaurants available in{" "}
            {district.name}, {state.name}.
          </p>
        </section>

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

        <section aria-labelledby="services-heading">
          <SectionHeader
            title="Explore & services"
            subtitle="Everything you need for the trip"
          />
          <ServiceGrid items={services} />
        </section>

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
              description={`There are no approved hotels in ${district.name} right now.`}
            />
          ) : (
            <div className="scroll-row -mx-4 px-4 pb-1 lg:mx-0 lg:px-0">
              {hotels.slice(0, 6).map((hotel) => (
                <MediaRowCard
                  key={hotel.id}
                  href={`${base}/hotels/${hotel.id}`}
                  image={firstImage(hotel.images) ?? hotel.profile_logo}
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
              description={`There are no approved restaurants in ${district.name} right now.`}
            />
          ) : (
            <div className="scroll-row -mx-4 px-4 pb-1 lg:mx-0 lg:px-0">
              {restaurants.slice(0, 6).map((restaurant) => (
                <MediaRowCard
                  key={restaurant.id}
                  href={`${base}/restaurants/${restaurant.id}`}
                  image={firstImage(restaurant.images) ?? restaurant.profile_logo}
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
                </DestinationLink>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
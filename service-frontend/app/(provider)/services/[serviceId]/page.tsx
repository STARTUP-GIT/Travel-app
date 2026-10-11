import { CalendarDays, MapPin, Phone, Star } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppImage } from "@/components/shared/app-image";
import { BackLink } from "@/components/shared/screen-header";
import { ErrorState, NoticeState } from "@/components/shared/states";
import { GlassCard } from "@/components/shared/glass-card";
import { PageHeader } from "@/components/shared/page-header";
import { Rating } from "@/components/shared/rating";
import { ListingStatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { VenueForm } from "@/features/provider/components/venue-form";
import { HotelForm } from "@/features/provider/components/hotel-form";
import { StayForm } from "@/features/provider/components/stay-form";
import { RestaurantForm } from "@/features/provider/components/restaurant-form";
import { getDistricts, getStates } from "@/features/locations/api/locations.api";
import { loadListings } from "@/features/provider/api/provider.actions";
import { requireProviderSession } from "@/features/provider/state/provider-session";
import type { ProviderListing } from "@/features/provider/types";
import { hotelOf, isStayListing, restaurantOf } from "@/features/provider/utils";
import { formatDate, formatCurrency, pluralize } from "@/lib/utils";

export const metadata: Metadata = { title: "Edit listing" };

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ serviceId: string }>;
}) {
  const { serviceId } = await params;
  await requireProviderSession(`/services/${serviceId}`);

  const result = await loadListings().catch(() => null);
  if (!result) {
    return (
      <div className="app-container">
        <BackLink href="/services" />
        <ErrorState
          title="Listing unavailable"
          description="This listing could not be loaded. Please try again."
        />
      </div>
    );
  }

  const listing = result.listings.find((item) => item.id === serviceId);
  if (!listing) {
    notFound();
  }

  const hotel = hotelOf(listing);
  const restaurant = restaurantOf(listing);
  const record = hotel ?? restaurant;

  if (!listing.editable || !record) {
    return (
      <div className="app-container max-w-2xl">
        <BackLink href="/services" />
        <PageHeader
          title={listing.name}
          description="Guide listings are managed from your profile."
        />
        <NoticeState
          title="This is your guide profile"
          description="Your languages, experience, and places come from your registration, so they are edited on the profile page instead."
        />
        <ProfileSummary listing={listing} />
      </div>
    );
  }

  const [districts, states] = await Promise.all([
    getDistricts().catch(() => []),
    getStates().catch(() => []),
  ]);

  if (hotel) {
    const isStay = isStayListing(listing);

    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <BackLink href="/services" />
        <PageHeader
          title={`Edit ${listing.name}`}
          description={
            isStay
              ? "Manage stay rules, dormitory beds, amenities and community details."
              : "Changes are visible to travellers as soon as you save."
          }
        />

        {result.partial ? (
          <NoticeState
            className="mb-4"
            title="Approved listings only"
            description="This page falls back to the public listing that belongs to you because the service cannot currently return your own hotel list."
          />
        ) : null}

        <GlassCard className="mb-8 gap-4 p-5">
          <div className="flex items-center gap-3">
            <AppImage
              src={listing.image}
              alt={listing.name}
              className="size-16 shrink-0 rounded-xl"
              fallbackClassName="rounded-xl"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-base font-semibold">{listing.name}</p>
                {listing.status ? (
                  <ListingStatusBadge status={listing.status} />
                ) : null}
                <Badge variant={isStay ? "secondary" : "outline"} className="text-[10px]">
                  {isStay ? "Stay / Hostel" : "Hotel"}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Listed {formatDate(listing.createdAt)}
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Fact icon={Star} label="Rating">
              <Rating value={listing.rating} size="sm" />
            </Fact>
            <Fact icon={MapPin} label="District">
              {listing.subtitle || "—"}
            </Fact>
            <Fact icon={CalendarDays} label="Starting from">
              {formatCurrency(hotel.cost_per_night)} {isStay ? "/ bed" : "/ night"}
            </Fact>
            <Fact icon={Star} label="Reviews">
              {pluralize(listing.reviews.length, "review")}
            </Fact>
          </dl>
        </GlassCard>

        {isStay ? (
          <StayForm
            initialStay={hotel}
            listingId={listing.id}
            submitLabel="Save changes"
            initialStates={states}
            initialDistricts={districts}
          />
        ) : (
          <HotelForm
            initialHotel={hotel}
            listingId={listing.id}
            submitLabel="Save changes"
            initialStates={states}
            initialDistricts={districts}
          />
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <BackLink href="/services" />
      <PageHeader
        title={`Edit ${listing.name}`}
        description="Changes are visible to travellers as soon as you save."
      />

      {result.partial ? (
        <NoticeState
          className="mb-4"
          title="Approved listings only"
          description="This page falls back to the public listing that belongs to you because the service cannot currently return your own hotel list."
        />
      ) : null}

      <GlassCard className="mb-8 gap-4 p-5">
        <div className="flex items-center gap-3">
          <AppImage
            src={listing.image}
            alt={listing.name}
            className="size-16 shrink-0 rounded-xl"
            fallbackClassName="rounded-xl"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-base font-semibold">{listing.name}</p>
              {listing.status ? (
                <ListingStatusBadge status={listing.status} />
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Listed {formatDate(listing.createdAt)}
            </p>
          </div>
        </div>

        {listing.status === "REJECTED" ? (
          <NoticeState
            title="This listing was not approved"
            description="Please check the details below and save again. An administrator reviews each submission."
          />
        ) : null}
        {listing.status === "PENDING" ? (
          <NoticeState
            title="Waiting for review"
            description="Travellers cannot see this listing until an administrator approves it."
          />
        ) : null}

        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Fact icon={Star} label="Rating">
            <Rating value={listing.rating} size="sm" />
          </Fact>
          <Fact icon={MapPin} label="District">
            {listing.subtitle || "—"}
          </Fact>
          <Fact icon={Star} label="Reviews">
            {pluralize(listing.reviews.length, "review")}
          </Fact>
        </dl>
      </GlassCard>

      <RestaurantForm
        initialRestaurant={restaurant ?? undefined}
        listingId={listing.id}
        submitLabel="Save changes"
        initialStates={states}
        initialDistricts={districts}
      />
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Star;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-muted/60 p-3">
      <dt className="flex items-center gap-1.5 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium">{children}</dd>
    </div>
  );
}

function ProfileSummary({ listing }: { listing: ProviderListing }) {
  return (
    <GlassCard className="gap-3 p-4">
      <p className="text-sm font-semibold">{listing.name}</p>
      {listing.placeNames.length > 0 ? (
        <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="size-3.5" />
          {listing.placeNames.join(", ")}
        </p>
      ) : null}
      {listing.price !== null ? (
        <p className="text-xs text-muted-foreground">
          {formatCurrency(listing.price)} {listing.priceUnit}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">{listing.description}</p>
    </GlassCard>
  );
}

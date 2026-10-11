import { CalendarDays, MapPin, Star, Users } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppImage } from "@/components/shared/app-image";
import { BackLink } from "@/components/shared/screen-header";
import { ErrorState, NoticeState } from "@/components/shared/states";
import { GlassCard } from "@/components/shared/glass-card";
import { PageHeader } from "@/components/shared/page-header";
import { Rating } from "@/components/shared/rating";
import { ListingStatusBadge } from "@/components/shared/status-badge";
import { StayForm } from "@/features/provider/components/stay-form";
import { getDistricts, getStates } from "@/features/locations/api/locations.api";
import { loadListings } from "@/features/provider/api/provider.actions";
import { requireProviderSession } from "@/features/provider/state/provider-session";
import { hotelOf } from "@/features/provider/utils";
import { formatDate, formatCurrency, pluralize } from "@/lib/utils";

export const metadata: Metadata = { title: "Edit Stay or Hostel" };

export default async function StayDetailPage({
  params,
}: {
  params: Promise<{ serviceId: string }>;
}) {
  const { serviceId } = await params;
  await requireProviderSession(`/stays/services/${serviceId}`);

  const result = await loadListings().catch(() => null);
  if (!result) {
    return (
      <div className="app-container">
        <BackLink href="/stays/services" />
        <ErrorState
          title="Stay listing unavailable"
          description="This stay listing could not be loaded. Please try again."
        />
      </div>
    );
  }

  const listing = result.listings.find((item) => item.id === serviceId);
  if (!listing) {
    notFound();
  }

  const hotel = hotelOf(listing);
  if (!hotel) {
    notFound();
  }

  const [districts, states] = await Promise.all([
    getDistricts().catch(() => []),
    getStates().catch(() => []),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <BackLink href="/stays/services" />
      <PageHeader
        title={`Edit ${listing.name}`}
        description="Changes to dorms, bed prices, house rules, and facilities are visible to travellers once saved."
      />

      {result.partial ? (
        <NoticeState
          className="mb-4"
          title="Approved listings only"
          description="This page falls back to the public listing that belongs to you because the service cannot currently return your full list."
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

        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div className="rounded-xl bg-muted/60 p-3">
            <dt className="flex items-center gap-1.5 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
              <Star className="size-3" />
              Rating
            </dt>
            <dd className="mt-1 text-sm font-medium">
              <Rating value={listing.rating} size="sm" />
            </dd>
          </div>
          <div className="rounded-xl bg-muted/60 p-3">
            <dt className="flex items-center gap-1.5 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
              <MapPin className="size-3" />
              District
            </dt>
            <dd className="mt-1 text-sm font-medium">
              {listing.subtitle || "—"}
            </dd>
          </div>
          <div className="rounded-xl bg-muted/60 p-3">
            <dt className="flex items-center gap-1.5 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
              <CalendarDays className="size-3" />
              Starting from
            </dt>
            <dd className="mt-1 text-sm font-medium">
              {formatCurrency(hotel.cost_per_night)} / night
            </dd>
          </div>
          <div className="rounded-xl bg-muted/60 p-3">
            <dt className="flex items-center gap-1.5 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
              <Users className="size-3" />
              Room Types
            </dt>
            <dd className="mt-1 text-sm font-medium">
              {pluralize(hotel.room_types?.length || 0, "type")}
            </dd>
          </div>
        </dl>
      </GlassCard>

      <StayForm
        initialStay={hotel}
        listingId={listing.id}
        submitLabel="Save stay changes"
        initialStates={states}
        initialDistricts={districts}
      />
    </div>
  );
}

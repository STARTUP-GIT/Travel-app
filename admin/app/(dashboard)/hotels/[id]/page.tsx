"use client";

import { ArrowLeft, Star } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { ImageThumb } from "@/components/admin/image-thumb";
import { PageHeader } from "@/components/admin/page-header";
import { ErrorState, LoadingState, EmptyState } from "@/components/admin/state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { HotelAdmin } from "@/lib/types";

type HotelDetail = HotelAdmin & {
  hotelOwner?: { id: string; name: string; email: string; phone_number: string };
};

export default function HotelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const { data, loading, error, refetch } = useAdminData<{ hotel: HotelDetail }>(
    `/admin/api/hotels/${id}`
  );

  const hotel = data?.hotel;

  return (
    <div>
      <PageHeader title={hotel?.name ?? "Hotel"} subtitle={hotel?.district?.name ?? "Loading…"}>
        <Button asChild variant="outline" size="sm">
          <Link href="/hotels">
            <ArrowLeft className="size-4" /> All hotels
          </Link>
        </Button>
      </PageHeader>

      {loading ? (
        <LoadingState />
      ) : error || !hotel ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="mono-card flex flex-col items-start gap-4 p-5">
            <div className="flex w-full items-center gap-4">
              <ImageThumb
                src={hotel.profile_logo ?? hotel.images?.[0]}
                alt={hotel.name}
                className="size-14 rounded-xl"
              />
              <div>
                <h2 className="text-lg font-bold">{hotel.name}</h2>
                {hotel.rating != null ? (
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Star className="size-3.5 fill-current" /> {hotel.rating}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {hotel.booking_enabled ? (
                <Badge className="bg-zinc-900 text-white">Booking enabled</Badge>
              ) : (
                <Badge variant="outline">Bookings off</Badge>
              )}
              <Badge variant="outline">{formatCurrency(hotel.cost_per_night)} / night</Badge>
            </div>
            <dl className="w-full space-y-2 text-sm">
              <Dt label="Address" value={hotel.address} />
              <Dt label="District" value={hotel.district?.name ?? "—"} />
              <Dt label="Phone" value={hotel.phone_number ?? "—"} />
              <Dt label="WhatsApp" value={hotel.whatsapp_number ?? "—"} />
              <Dt label="Email" value={hotel.email ?? "—"} />
              <Dt label="Website" value={hotel.website ?? "—"} />
              <Dt label="Created" value={formatDate(hotel.createdAt)} />
            </dl>
          </div>

          <div className="space-y-5 lg:col-span-2">
            <div className="mono-card p-5">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Description
              </h3>
              <p className="whitespace-pre-wrap text-sm text-foreground/80">
                {hotel.description || "No description provided."}
              </p>
            </div>

            {hotel.hotelOwner ? (
              <div className="mono-card p-5">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Owner
                </h3>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{hotel.hotelOwner.name}</span>
                  <span className="text-muted-foreground">
                    {hotel.hotelOwner.email} · {hotel.hotelOwner.phone_number}
                  </span>
                </div>
              </div>
            ) : null}

            <div className="mono-card p-5">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Photos ({hotel.images.length})
              </h3>
              {hotel.images.length ? (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {hotel.images.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={`${src}-${i}`}
                      src={src}
                      alt={`${hotel.name} ${i + 1}`}
                      loading="lazy"
                      className="aspect-square w-full rounded-lg border border-border object-cover"
                    />
                  ))}
                </div>
              ) : (
                <EmptyState title="No photos" description="This hotel has no photos." />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Dt({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right break-words font-medium">{value}</dd>
    </div>
  );
}
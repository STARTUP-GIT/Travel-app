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
import { formatDate } from "@/lib/utils";
import type { RestaurantAdmin } from "@/lib/types";

type RestaurantDetail = RestaurantAdmin & {
  restaurentOwner?: { id: string; name: string; email: string; phone_number: string };
};

export default function RestaurantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const { data, loading, error, refetch } = useAdminData<{ restaurant: RestaurantDetail }>(
    `/admin/api/restaurants/${id}`
  );

  const restaurant = data?.restaurant;

  return (
    <div>
      <PageHeader
        title={restaurant?.name ?? "Restaurant"}
        subtitle={restaurant?.district?.name ?? "Loading…"}
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/restaurants">
            <ArrowLeft className="size-4" /> All restaurants
          </Link>
        </Button>
      </PageHeader>

      {loading ? (
        <LoadingState />
      ) : error || !restaurant ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="mono-card flex flex-col items-start gap-4 p-5">
            <div className="flex w-full items-center gap-4">
              <ImageThumb
                src={restaurant.profile_logo ?? restaurant.images?.[0]}
                alt={restaurant.name}
                className="size-14 rounded-xl"
              />
              <div>
                <h2 className="text-lg font-bold">{restaurant.name}</h2>
                {restaurant.rating != null ? (
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Star className="size-3.5 fill-current" /> {restaurant.rating}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {restaurant.booking_enabled ? (
                <Badge className="bg-zinc-900 text-white">Reservations open</Badge>
              ) : (
                <Badge variant="outline">Reservations closed</Badge>
              )}
              <Badge variant="outline">{restaurant.food_category?.replace(/_/g, " ").toLowerCase()}</Badge>
            </div>
            <dl className="w-full space-y-2 text-sm">
              <Dt label="Address" value={restaurant.address} />
              <Dt label="District" value={restaurant.district?.name ?? "—"} />
              <Dt label="Phone" value={restaurant.phone_number ?? "—"} />
              <Dt label="WhatsApp" value={restaurant.whatsapp_number ?? "—"} />
              <Dt label="Email" value={restaurant.email ?? "—"} />
              <Dt label="Website" value={restaurant.website ?? "—"} />
              <Dt label="Created" value={formatDate(restaurant.createdAt)} />
            </dl>
          </div>

          <div className="space-y-5 lg:col-span-2">
            <div className="mono-card p-5">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Description
              </h3>
              <p className="whitespace-pre-wrap text-sm text-foreground/80">
                {restaurant.description || "No description provided."}
              </p>
            </div>

            {restaurant.menu && restaurant.menu.length > 0 ? (
              <div className="mono-card p-5">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Menu ({restaurant.menu.length})
                </h3>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {restaurant.menu.map((item, i) => (
                    <li key={i} className="rounded-lg bg-muted/40 p-3 text-sm">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {restaurant.restaurentOwner ? (
              <div className="mono-card p-5">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Owner
                </h3>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{restaurant.restaurentOwner.name}</span>
                  <span className="text-muted-foreground">
                    {restaurant.restaurentOwner.email} · {restaurant.restaurentOwner.phone_number}
                  </span>
                </div>
              </div>
            ) : null}

            <div className="mono-card p-5">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Photos ({restaurant.images.length})
              </h3>
              {restaurant.images.length ? (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {restaurant.images.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={`${src}-${i}`}
                      src={src}
                      alt={`${restaurant.name} ${i + 1}`}
                      loading="lazy"
                      className="aspect-square w-full rounded-lg border border-border object-cover"
                    />
                  ))}
                </div>
              ) : (
                <EmptyState title="No photos" description="This restaurant has no photos." />
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
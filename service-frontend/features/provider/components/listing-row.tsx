"use client";

import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { AppImage } from "@/components/shared/app-image";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Rating } from "@/components/shared/rating";
import { ListingStatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { editService, removeService } from "@/features/provider/api/provider.actions";
import type { ProviderListing } from "@/features/provider/types";
import { hotelOf, listingToInput, restaurantOf } from "@/features/provider/utils";
import { formatCurrency, pluralize } from "@/lib/utils";

/** A single venue row carrying the actions the backend actually supports. */
export function ListingRow({ listing }: { listing: ProviderListing }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const hotel = hotelOf(listing);
  const restaurant = restaurantOf(listing);

  async function toggleBooking(enabled: boolean) {
    const input = listingToInput(listing);
    if (!input) return;

    setBusy(true);
    const result = await editService(listing.id, { ...input, bookingEnabled: enabled });
    setBusy(false);

    if (result.ok) {
      toast.success(enabled ? "Bookings turned on" : "Bookings turned off");
      router.refresh();
    } else {
      toast.error(result.message);
    }
  }

  async function remove() {
    setBusy(true);
    const result = await removeService(listing.id);
    setBusy(false);

    if (result.ok) {
      toast.success("Listing deleted");
      router.refresh();
    } else {
      toast.error(result.message);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:flex-row sm:items-center">
      <AppImage
        src={listing.image}
        alt={listing.name}
        className="h-32 w-full shrink-0 rounded-xl sm:size-20"
        fallbackClassName="rounded-xl"
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/services/${listing.id}`}
            className="truncate text-sm font-semibold hover:underline"
          >
            {listing.name}
          </Link>
          {listing.status ? (
            <ListingStatusBadge status={listing.status} />
          ) : null}
          {listing.editable ? (
            <Badge variant={listing.active ? "success" : "outline"}>
              {listing.active ? "Bookable" : "Paused"}
            </Badge>
          ) : null}
        </div>

        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {listing.subtitle}
          {listing.address ? ` · ${listing.address}` : ""}
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {hotel ? (
            <span>{formatCurrency(hotel.cost_per_night)} per night</span>
          ) : null}
          {restaurant ? (
            <>
              <span className="capitalize">
                {restaurant.food_category.replace(/_/g, " ").toLowerCase()}
              </span>
              <span>{pluralize(restaurant.menu.length, "menu item")}</span>
            </>
          ) : null}
          {listing.price !== null && !hotel ? (
            <span>
              {formatCurrency(listing.price)} {listing.priceUnit}
            </span>
          ) : null}
          <Rating
            value={listing.rating}
            count={listing.reviews.length}
            size="xs"
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 sm:flex-col sm:items-end">
        {listing.editable ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Bookable</span>
            <Switch
              checked={listing.active}
              disabled={busy}
              onCheckedChange={toggleBooking}
              aria-label={`Turn bookings ${listing.active ? "off" : "on"} for ${listing.name}`}
            />
          </div>
        ) : null}

        <div className="flex items-center gap-1.5">
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link href={listing.editable ? `/services/${listing.id}` : "/profile"}>
              <Pencil className="size-3.5" />
              Edit
            </Link>
          </Button>

          {listing.editable ? (
            <ConfirmDialog
              title={`Delete ${listing.name}?`}
              description="This removes the listing and the history travellers can see. It cannot be undone."
              confirmLabel="Delete listing"
              onConfirm={remove}
              trigger={
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-9 rounded-full text-destructive"
                  aria-label={`Delete ${listing.name}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              }
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ListingRowSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:flex-row sm:items-center">
      <Skeleton className="h-32 w-full shrink-0 rounded-xl sm:size-20" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

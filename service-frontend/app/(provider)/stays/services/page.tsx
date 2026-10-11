import { BedDouble, BedSingle, Hotel, Plus, Sparkles, Store } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

import { NoticeState, EmptyState, ErrorState } from "@/components/shared/states";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { loadListings } from "@/features/provider/api/provider.actions";
import { requireProviderSession } from "@/features/provider/state/provider-session";
import { ListingRow } from "@/features/provider/components/listing-row";
import { hotelOf } from "@/features/provider/utils";

export const metadata: Metadata = { title: "My Stays & Hostels" };

export default async function StaysServicesPage() {
  await requireProviderSession("/stays/services");

  const result = await loadListings().catch((error: unknown) => ({
    error:
      error instanceof Error
        ? error.message
        : "Your stays listings could not be loaded.",
  }));

  if ("error" in result) {
    return (
      <div className="app-container">
        <PageHeader title="My Stays & Hostels" />
        <ErrorState title="Could not load your stays" description={result.error} />
      </div>
    );
  }

  const { listings, partial } = result;

  // Filter listings: Stays are those with property_type === "STAY" or stay_category set
  const stayListings = listings.filter((item) => {
    const hotel = hotelOf(item);
    return hotel?.property_type === "STAY" || Boolean(hotel?.stay_category);
  });

  // If the provider doesn't have any explicitly marked stays yet, we show all their hotel/accommodation listings
  // but highlight how to add a dedicated backpacker stay
  const displayListings = stayListings.length > 0 ? stayListings : listings;
  const isFiltered = stayListings.length > 0;

  return (
    <div className="app-container">
      {/* Stays Portal Banner */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-emerald-500/25 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-5">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-600 text-white font-bold uppercase text-[0.65rem] tracking-wide">
              Stays & Hostels
            </Badge>
            <span className="text-xs text-muted-foreground">
              Dorms, Homestays & Community Stays
            </span>
          </div>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight">
            My Stays & Hostels
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your backpacker hostels, dorm bed inventory, rates, and community experiences.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button asChild variant="outline" size="sm" className="rounded-xl gap-1.5">
            <Link href="/services">
              <Hotel className="size-3.5" />
              Hotel Services View
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-sm"
          >
            <Link href="/stays/services/new">
              <Plus className="size-3.5" />
              Add a Stay / Hostel
            </Link>
          </Button>
        </div>
      </div>

      {partial ? (
        <NoticeState
          className="mb-4"
          title="Approved listings only"
          description="The service cannot currently return your full list, so this page falls back to the public approved listings that belong to you."
        />
      ) : null}

      {displayListings.length === 0 ? (
        <EmptyState
          icon={BedSingle}
          title="No Stays or Hostels listed yet"
          description="Create your first backpacker hostel, homestay, or boutique stay property with shared dorm beds and private rooms."
          action={
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              <Link href="/stays/services/new">
                <Plus className="size-4" />
                Add your first Stay / Hostel
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>
              Showing {displayListings.length} {displayListings.length === 1 ? "property" : "properties"}
              {isFiltered ? " (Stays & Hostels)" : " (Accommodations)"}
            </span>
            <Link href="/services" className="font-semibold text-primary hover:underline">
              View standard hotel listings →
            </Link>
          </div>

          <ul className="flex flex-col gap-3">
            {displayListings.map((listing) => {
              const hotel = hotelOf(listing);
              const isStay = hotel?.property_type === "STAY" || Boolean(hotel?.stay_category);
              return (
                <li key={listing.id} className="relative">
                  <ListingRow listing={listing} />
                  {isStay ? (
                    <div className="absolute top-4 right-24 hidden sm:flex items-center gap-1.5 pointer-events-none">
                      <Badge className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 text-[0.65rem]">
                        {hotel?.stay_category
                          ? hotel.stay_category.replace(/_/g, " ")
                          : "Stay / Hostel"}
                      </Badge>
                      {hotel?.room_types && hotel.room_types.length > 0 ? (
                        <span className="text-[0.65rem] text-muted-foreground font-medium">
                          {hotel.room_types.length} {hotel.room_types.length === 1 ? "room type" : "room types"}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

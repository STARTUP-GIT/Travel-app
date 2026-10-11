import { BedSingle, Building2, Compass, Plus, Store } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

import { NoticeState, EmptyState, ErrorState } from "@/components/shared/states";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { loadListings, loadTourPackages, loadAllManageablePlaces } from "@/features/provider/api/provider.actions";
import { getDistricts } from "@/features/locations/api/locations.api";
import { requireProviderSession } from "@/features/provider/state/provider-session";
import { providerMeta } from "@/features/provider/config";
import { ListingRow } from "@/features/provider/components/listing-row";
import { CommonGuideServices } from "@/features/provider/components/common-guide-services";
import { isStayListing } from "@/features/provider/utils";

export const metadata: Metadata = { title: "My properties" };

export default async function ServicesPage() {
  const session = await requireProviderSession("/services");
  const meta = providerMeta(session.kind);

  if (session.kind === "common_guide") {
    const [packagesResult, placesResult, districts] = await Promise.all([
      loadTourPackages().catch((error: unknown) => ({
        packages: [],
        error:
          error instanceof Error
            ? error.message
            : "Your tour packages could not be loaded. Please try again.",
      })),
      loadAllManageablePlaces().catch((error: unknown) => ({
        places: [],
        error:
          error instanceof Error
            ? error.message
            : "Places could not be loaded. Please try again.",
      })),
      getDistricts().catch(() => []),
    ]);

    return (
      <CommonGuideServices
        packages={packagesResult.packages}
        packagesError={packagesResult.error}
        places={placesResult.places}
        placesError={placesResult.error}
        districts={districts}
      />
    );
  }

  const result = await loadListings().catch((error: unknown) => ({
    error:
      error instanceof Error
        ? error.message
        : "Your services could not be loaded.",
  }));

  if ("error" in result) {
    return (
      <div className="app-container">
        <PageHeader title={session.kind === "hotel" ? "My properties" : "My services"} />
        <ErrorState title="Could not load your services" description={result.error} />
      </div>
    );
  }

  const { listings, partial } = result;

  const isAccommodation = session.kind === "hotel";
  const hotelListings = isAccommodation ? listings.filter((l) => !isStayListing(l)) : [];
  const stayListings = isAccommodation ? listings.filter((l) => isStayListing(l)) : [];

  return (
    <div className="app-container">
      <PageHeader
        title={
          isAccommodation
            ? "My properties"
            : meta.managesVenues
              ? "My services"
              : "Your guide listing"
        }
        description={
          isAccommodation
            ? "Manage all your accommodation properties, room types, pricing, and availability."
            : meta.managesVenues
              ? "Every property and table you publish, with the controls travellers see."
              : "Your guide listing is created from your profile. Places cannot be changed here — that is fixed at registration."
        }
        actions={
          meta.managesVenues ? (
            <div className="flex items-center gap-2">
              <Button asChild className="rounded-full">
                <Link href="/services/new">
                  <Plus className="size-4 mr-1" />
                  {isAccommodation ? "Create Property" : "Add a listing"}
                </Link>
              </Button>
            </div>
          ) : null
        }
      />

      {partial ? (
        <NoticeState
          className="mb-4"
          title="Only approved listings are shown"
          description="The service cannot currently return your own hotel list, so this page falls back to the public approved listings that belong to you. Anything still waiting for approval is not included."
        />
      ) : null}

      {/* CASE: NO LISTINGS */}
      {listings.length === 0 ? (
        <EmptyState
          icon={isAccommodation ? Building2 : Store}
          title={isAccommodation ? "No properties yet" : (meta.managesVenues ? "No listings yet" : "No listing found")}
          description={
            isAccommodation
              ? "Publish your first hotel, resort, or backpacker stay so travellers can find and book with you."
              : meta.managesVenues
                ? "Publish your first listing so travellers can find and request you."
                : "Your guide profile could not be read. Please try again in a moment."
          }
          action={
            meta.managesVenues ? (
              <Button asChild>
                <Link href="/services/new">
                  <Plus className="size-4 mr-1" />
                  {isAccommodation ? "Create Property" : "Add a listing"}
                </Link>
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link href="/profile">
                  <Compass className="size-4" />
                  Open my profile
                </Link>
              </Button>
            )
          }
        />
      ) : isAccommodation ? (
        /* ACCOMMODATION CONDITIONAL RENDERING */
        <div className="space-y-8">
          {/* If provider has created only Hotels */}
          {hotelListings.length > 0 && stayListings.length === 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="size-5 text-primary" />
                  <h2 className="text-base font-bold tracking-tight">Hotels & Resorts</h2>
                  <Badge variant="secondary" className="text-xs">
                    {hotelListings.length}
                  </Badge>
                </div>
              </div>
              <ul className="flex flex-col gap-3">
                {hotelListings.map((listing) => (
                  <li key={listing.id}>
                    <ListingRow listing={listing} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* If provider has created only Stays */}
          {stayListings.length > 0 && hotelListings.length === 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <BedSingle className="size-5 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-base font-bold tracking-tight">Stays & Hostels</h2>
                  <Badge variant="secondary" className="text-xs">
                    {stayListings.length}
                  </Badge>
                </div>
              </div>
              <ul className="flex flex-col gap-3">
                {stayListings.map((listing) => (
                  <li key={listing.id}>
                    <ListingRow listing={listing} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* If provider has created both Hotels and Stays */}
          {hotelListings.length > 0 && stayListings.length > 0 ? (
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-5 text-primary" />
                    <h2 className="text-base font-bold tracking-tight">Hotels & Resorts</h2>
                    <Badge variant="secondary" className="text-xs">
                      {hotelListings.length}
                    </Badge>
                  </div>
                </div>
                <ul className="flex flex-col gap-3">
                  {hotelListings.map((listing) => (
                    <li key={listing.id}>
                      <ListingRow listing={listing} />
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <BedSingle className="size-5 text-emerald-600 dark:text-emerald-400" />
                    <h2 className="text-base font-bold tracking-tight">Stays & Hostels</h2>
                    <Badge variant="secondary" className="text-xs">
                      {stayListings.length}
                    </Badge>
                  </div>
                </div>
                <ul className="flex flex-col gap-3">
                  {stayListings.map((listing) => (
                    <li key={listing.id}>
                      <ListingRow listing={listing} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        /* NON-HOTEL PROVIDERS (e.g. Restaurants) */
        <ul className="flex flex-col gap-3">
          {listings.map((listing) => (
            <li key={listing.id}>
              <ListingRow listing={listing} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

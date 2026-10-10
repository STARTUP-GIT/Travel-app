import { Compass, Plus, Route, Store } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

import { NoticeState, EmptyState, ErrorState } from "@/components/shared/states";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { loadListings, loadTourPackages } from "@/features/provider/api/provider.actions";
import { requireProviderSession } from "@/features/provider/state/provider-session";
import { providerMeta } from "@/features/provider/config";
import { ListingRow } from "@/features/provider/components/listing-row";
import { TourPackageManager } from "@/features/provider/components/tour-package-manager";

export const metadata: Metadata = { title: "My services" };

export default async function ServicesPage() {
  const session = await requireProviderSession("/services");
  const meta = providerMeta(session.kind);

  if (session.kind === "common_guide") {
    const packagesResult = await loadTourPackages().catch((error: unknown) => ({
      packages: [],
      error:
        error instanceof Error
          ? error.message
          : "Your tour packages could not be loaded. Please try again.",
    }));

    return (
      <div className="app-container">
        <PageHeader
          icon={<Route className="size-6 text-primary" />}
          title="Tour Packages"
          description="Create, configure, and manage all your tour packages, pricing rules, itineraries, meals, transport, and specific guide services."
        />
        <TourPackageManager
          packages={packagesResult.packages}
          error={packagesResult.error}
        />
      </div>
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
        <PageHeader title="My services" />
        <ErrorState title="Could not load your services" description={result.error} />
      </div>
    );
  }

  const { listings, partial } = result;

  return (
    <div className="app-container">
      <PageHeader
        title={meta.managesVenues ? "My services" : "Your guide listing"}
        description={
          meta.managesVenues
            ? "Every property and table you publish, with the controls travellers see."
            : "Your guide listing is created from your profile. Places cannot be changed here — that is fixed at registration."
        }
        actions={
          meta.managesVenues ? (
            <Button asChild className="rounded-full">
              <Link href="/services/new">
                <Plus className="size-4" />
                Add a listing
              </Link>
            </Button>
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

      {listings.length === 0 ? (
        <EmptyState
          icon={Store}
          title={meta.managesVenues ? "No listings yet" : "No listing found"}
          description={
            meta.managesVenues
              ? "Publish your first listing so travellers can find and request you."
              : "Your guide profile could not be read. Please try again in a moment."
          }
          action={
            meta.managesVenues ? (
              <Button asChild>
                <Link href="/services/new">
                  <Plus className="size-4" />
                  Add a listing
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
      ) : (
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

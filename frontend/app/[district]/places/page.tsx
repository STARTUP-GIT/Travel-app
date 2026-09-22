import type { Metadata } from "next";
import { Search, X } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { ScreenHeader } from "@/components/shared/screen-header";
import { EmptyState } from "@/components/shared/states";
import { LoadingState } from "@/components/shared/loading-state";
import { PlaceCard } from "@/features/places/ui/place-card";
import { getPlacesByDistrict } from "@/features/places/api/places.api";
import { requireDistrict } from "@/features/locations/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ district: string }>;
}): Promise<Metadata> {
  const { district: slug } = await params;
  try {
    const district = await requireDistrict(slug);
    return {
      title: `Famous Places in ${district.name}`,
      description: `Explore the famous places in ${district.name}, Karnataka.`,
    };
  } catch {
    return { title: "Famous Places" };
  }
}

export default async function PlacesPage({
  params,
  searchParams,
}: {
  params: Promise<{ district: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { district: slug } = await params;
  const { q } = await searchParams;
  const district = await requireDistrict(slug);

  const all = await getPlacesByDistrict(district.id).catch(() => []);
  const query = (q ?? "").trim().toLowerCase();
  const places = query
    ? all.filter((p) =>
        [p.name, p.category, p.description, p.district?.name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query)
      )
    : all;

  return (
    <div className="pb-6">
      <ScreenHeader
        title={query ? `Results for “${q}”` : "Famous Places"}
        subtitle={`${district.name} district · ${places.length} place${places.length === 1 ? "" : "s"}`}
        backHref={`/${slug}?focus=places`}
      />

      {query ? (
        <div className="app-container mb-5 -mt-1 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
            <Search className="size-3.5" />
            Searching within {district.name}
          </span>
          <Link
            href={`/${slug}/places`}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-3.5" /> Clear search
          </Link>
        </div>
      ) : null}

      <Suspense fallback={<LoadingState label="Loading places…" />}>
        {all.length === 0 ? (
          <div className="app-container">
            <EmptyState
              icon={Search}
              title="No places published yet"
              description={`There are no approved places for ${district.name} right now. Check back soon!`}
            />
          </div>
        ) : places.length === 0 ? (
          <div className="app-container">
            <EmptyState
              icon={Search}
              title="Nothing matched your search"
              description={`We couldn't find any place in ${district.name} matching “${q}”. Try a different keyword.`}
            />
          </div>
        ) : (
          <div className="app-container grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {places.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                districtSlug={slug}
                showFavorite
              />
            ))}
          </div>
        )}
      </Suspense>
    </div>
  );
}
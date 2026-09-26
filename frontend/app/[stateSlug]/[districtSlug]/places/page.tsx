import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Search, X } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { ScreenHeader } from "@/components/shared/screen-header";
import { EmptyState } from "@/components/shared/states";
import { LoadingState } from "@/components/shared/loading-state";
import { PlaceCard } from "@/features/places/ui/place-card";
import { getPlacesByDistrict } from "@/features/places/api/places.api";
import { resolveStateDistrict, tryStateDistrict } from "@/features/locations/server";
import { DistrictUnavailable } from "@/components/shared/district-unavailable";

type RouteParams = { stateSlug: string; districtSlug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { stateSlug, districtSlug } = await params;
  const resolved = await tryStateDistrict(stateSlug, districtSlug);
  if (!resolved) return { title: "Famous Places" };
  const { state, district } = resolved;
  return {
    title: `Famous Places in ${district.name}`,
    description: `Explore the famous places in ${district.name}, ${state.name}.`,
  };
}

export default async function PlacesPage({
  params,
  searchParams,
}: {
  params: Promise<RouteParams>;
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { stateSlug, districtSlug } = await params;
  const resolution = await resolveStateDistrict(stateSlug, districtSlug);
  if (resolution.status === "error") {
    return <DistrictUnavailable message={resolution.message} />;
  }
  if (resolution.status === "missing") notFound();
  const { state, district } = resolution;
  const base = `/${state.slug}/${district.slug}`;

  const raw = await searchParams;
  const q = Array.isArray(raw?.q) ? raw.q[0] : raw?.q;

  const all = (await getPlacesByDistrict(district.id).catch(() => [])).filter(
    (place) =>
      place.status === "APPROVED" &&
      (place.districtId ?? place.district?.id) === district.id
  );

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
        backHref={base}
      />

      {query ? (
        <div className="app-container mb-5 -mt-1 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
            <Search className="size-3.5" />
            Searching within {district.name}
          </span>
          <Link
            href={`${base}/places`}
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
                districtSlug={district.slug}
                stateSlug={state.slug}
                showFavorite
              />
            ))}
          </div>
        )}
      </Suspense>
    </div>
  );
}

"use client";

import * as React from "react";
import { Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { ScreenHeader } from "@/components/shared/screen-header";
import { SectionHeader } from "@/components/shared/section-header";
import { EmptyState } from "@/components/shared/states";
import { MediaRowCard } from "@/components/shared/media-row-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GuideCard } from "@/features/guides/ui/guide-card";
import { useCurrentDistrict } from "@/features/locations/state/current-district-provider";
import { resolveDistrictBySlug } from "@/features/locations/api/locations.api";
import { searchDistrict, type SearchResults } from "@/features/search/api/search.api";
import { cn } from "@/lib/utils";

export default function SearchScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { slug } = useCurrentDistrict();

  const initialQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = React.useState(initialQuery);
  const [results, setResults] = React.useState<SearchResults | null>(null);
  const [searching, setSearching] = React.useState(false);
  const [districtName, setDistrictName] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!slug) {
      setQuery("");
      setResults(null);
      return;
    }
    resolveDistrictBySlug(slug).then((d) => setDistrictName(d?.name ?? null));
  }, [slug]);

  React.useEffect(() => {
    if (initialQuery && slug) {
      void runSearch(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runSearch(raw: string) {
    const q = raw.trim();
    if (q.length < 2) {
      setResults(null);
      setError(null);
      return;
    }
    if (!slug) {
      setError("Pick a district first");
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const resolved = await resolveDistrictBySlug(slug);
      if (!resolved) {
        setError("This district isn't available yet.");
        return;
      }
      const data = await searchDistrict(resolved.id, q);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed. Try again.");
      setResults(null);
    } finally {
      setSearching(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.replace(`/search?q=${encodeURIComponent(q)}`);
    void runSearch(q);
  }

  return (
    <div className="pb-6">
      <ScreenHeader
        title="Search"
        subtitle={slug ? `Searching within ${districtName ?? slug}` : "Choose a district to search"}
      />

      <div className="app-container">
        {!slug ? (
          <EmptyState
            icon={Search}
            title="Pick a district first"
            description="Search finds results inside one district at a time."
            action={
              <Button asChild variant="action" className="rounded-xl">
                <Link href="/explore">Explore districts</Link>
              </Button>
            }
          />
        ) : (
          <form onSubmit={submit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${districtName ?? "this district"}…`}
                className="rounded-xl py-6 pl-9"
                aria-label="Search"
              />
            </div>
            <Button type="submit" variant="action" className="rounded-xl" disabled={searching}>
              {searching ? "…" : "Search"}
            </Button>
          </form>
        )}

        <div className="mt-6">
          {error ? (
            <EmptyState
              title="Couldn't run the search"
              description={error}
              action={
                <Button asChild variant="outline" className="rounded-xl">
                  <Link href="/explore">{slug ? "Change district" : "Explore districts"}</Link>
                </Button>
              }
            />
          ) : searching ? (
            <SearchingState />
          ) : results && query.trim().length >= 2 ? (
            results.total === 0 ? (
              <EmptyState
                icon={Search}
                title="No results"
                description={`Nothing matched “${query}” in ${districtName ?? slug}. Try a different keyword.`}
              />
            ) : (
              <div className="space-y-8">
                {results.groups.map((group) => (
                  <section key={group.kind}>
                    <SectionHeader
                      title={GROUP_LABEL[group.kind]}
                      subtitle={`${group.items.length} result${group.items.length === 1 ? "" : "s"}`}
                    />
                    {group.kind === "places" ? (
                      <div className="space-y-2.5">
                        {group.items.map((p) => (
                          <MediaRowCard
                            key={p.id}
                            href={`/${slug}/places/${p.id}`}
                            image={p.images?.[0]}
                            title={p.name}
                            subtitle={p.category ?? p.district?.name ?? "Place"}
                            badge={`₹${Math.round(p.entryfee)}`}
                          />
                        ))}
                      </div>
                    ) : group.kind === "hotels" ? (
                      <div className="space-y-2.5">
                        {group.items.map((h) => (
                          <MediaRowCard
                            key={h.id}
                            href={`/${slug}/hotels/${h.id}`}
                            image={h.images?.[0] ?? h.profile_logo}
                            title={h.name}
                            subtitle={h.address}
                            badge={`₹${Math.round(h.cost_per_night)}/night`}
                          />
                        ))}
                      </div>
                    ) : group.kind === "restaurants" ? (
                      <div className="space-y-2.5">
                        {group.items.map((r) => (
                          <MediaRowCard
                            key={r.id}
                            href={`/${slug}/restaurants/${r.id}`}
                            image={r.images?.[0] ?? r.profile_logo}
                            title={r.name}
                            subtitle={r.address}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                        {group.items.map((g) => (
                          <GuideCard key={g.guide.id} guide={g} districtSlug={slug!} />
                        ))}
                      </div>
                    )}
                  </section>
                ))}
              </div>
            )
          ) : results ? (
            <QueryHint districtName={districtName ?? slug!} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

const GROUP_LABEL: Record<"places" | "hotels" | "restaurants" | "guides", string> = {
  places: "Places",
  hotels: "Hotels",
  restaurants: "Restaurants",
  guides: "Guides",
};

function QueryHint({ districtName }: { districtName: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
      <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
      <div>
        <p className="text-sm font-semibold">Try “Palace” or “Temple”</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Search places, hotels, restaurants and guides in {districtName} with at least two characters.
        </p>
      </div>
    </div>
  );
}

function SearchingState() {
  return (
    <div className="space-y-4" aria-label="Searching" role="status">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            "h-[4.5rem] animate-pulse rounded-2xl bg-muted",
            i % 2 ? "w-3/4" : "w-full"
          )}
        />
      ))}
      <p className="sr-only">Searching…</p>
    </div>
  );
}
"use client";

import { BookmarkX, Compass, Heart, MapPin } from "lucide-react";
import Link from "next/link";

import { AppImage } from "@/components/shared/app-image";
import { ScreenHeader } from "@/components/shared/screen-header";
import { SectionHeader } from "@/components/shared/section-header";
import { NoSavedState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/features/favorites/hooks/useFavorites";
import type { FavoriteSnapshot } from "@/features/favorites/types";
import { useCurrentDistrict } from "@/features/locations/state/current-district-provider";

export default function SavedScreen() {
  const { snapshots, toggle } = useFavorites();
  const { slug, stateSlug } = useCurrentDistrict();

  const districtBase = stateSlug && slug ? `/${stateSlug}/${slug}` : slug ? `/${slug}` : null;
  const { places, guides } = snapshots;
  const total = places.length + guides.length;

  return (
    <div className="pb-6">
      <ScreenHeader title="Saved" subtitle={`${total} item${total === 1 ? "" : "s"} in your list`} />

      <div className="app-container">
        {total === 0 ? (
          <NoSavedState
            action={
              <Button asChild variant="outline">
                <Link href={districtBase ? `${districtBase}/places` : "/explore"}>Browse places</Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-8">
            <SavedGroup
              title="Places"
              label="Saved places"
              items={places}
              hrefBase={(s) => {
                const base = stateSlug && (s?.districtSlug ?? slug) ? `/${stateSlug}/${s?.districtSlug ?? slug}` : `/${s?.districtSlug ?? slug}`;
                return `${base}/${s.id}`;
              }}
              onRemove={(item) => toggle(item.id, "place")}
              icon={<MapPin className="size-4" />}
            />
            <SavedGroup
              title="Guides"
              label="Saved guides"
              items={guides}
              hrefBase={(s) => {
                const base = stateSlug && (s?.districtSlug ?? slug) ? `/${stateSlug}/${s?.districtSlug ?? slug}` : `/${s?.districtSlug ?? slug}`;
                return `${base}/guides/${s.id}`;
              }}
              onRemove={(item) => toggle(item.id, "guide")}
              icon={<Heart className="size-4" />}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function SavedGroup({
  title,
  label,
  items,
  hrefBase,
  onRemove,
  icon,
}: {
  title: string;
  label: string;
  items: FavoriteSnapshot[];
  hrefBase: (item: FavoriteSnapshot) => string;
  onRemove: (item: FavoriteSnapshot) => void;
  icon: React.ReactNode;
}) {
  return (
    <section>
      <SectionHeader title={title} subtitle={label} />
      {items.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
          <Compass className="size-5 shrink-0" />
          Nothing saved here yet.
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => {
            const href = hrefBase(item);
            return (
              <div
                key={item.id}
                className="card-surface group flex items-center gap-3 rounded-2xl p-2.5"
              >
                <Link href={href} className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                    {item.image ? (
                      <AppImage src={item.image} alt={item.name ?? "Saved item"} />
                    ) : (
                      <span className="flex size-full items-center justify-center bg-primary/10 text-primary">
                        {icon}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {item.name ?? "Saved item"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.districtSlug
                        ? `${item.districtSlug} · Karnataka`
                        : "Open to view"}
                    </p>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => onRemove(item)}
                  aria-label={`Remove ${item.name ?? "item"} from saved`}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <BookmarkX className="size-[18px]" />
                </button>
              </div>
            );
          })}
        </div>
        )}
      </section>
    );
  }
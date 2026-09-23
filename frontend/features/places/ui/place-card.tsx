import { ArrowRight, MapPin } from "lucide-react";
import Link from "next/link";

import { AppImage } from "@/components/shared/app-image";
import { FavoriteButton } from "@/components/shared/favorite-button";
import { GlassCard } from "@/components/shared/glass-card";
import { Badge } from "@/components/ui/badge";
import type { Place } from "@/features/places/types";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function PlaceCard({
  place,
  districtSlug,
  stateSlug,
  className,
  horizontal = false,
  showFavorite = false,
}: {
  place: Place;
  districtSlug: string;
  stateSlug?: string;
  className?: string;
  horizontal?: boolean;
  showFavorite?: boolean;
}) {
  const districtBase = stateSlug ? `/${stateSlug}/${districtSlug}` : `/${districtSlug}`;
  const href = `${districtBase}/places/${place.id}`;

  if (horizontal) {
    return (
      <div className={cn("card-surface relative w-[17rem] overflow-hidden rounded-2xl", className)}>
        <Link href={href} className="flex flex-col">
          <div className="relative aspect-[16/10] overflow-hidden">
            <AppImage src={place.images?.[0]} alt={place.name} />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
            <Badge className="absolute left-2.5 top-2.5 capitalize bg-black/45 text-white border-white/25">
              {place.category || "Place"}
            </Badge>
          </div>
          <div className="flex flex-1 items-center justify-between gap-2 p-3.5">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold">{place.name}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatCurrency(place.entryfee)} entry fee
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">
              Info <ArrowRight className="size-3.5" />
            </span>
          </div>
        </Link>
      </div>
    );
  }

  return (
    <GlassCard hover className={cn("group", className)}>
      <Link href={href} className="flex flex-1 flex-col">
        <div className="relative aspect-[4/3] overflow-hidden">
          <AppImage
            src={place.images?.[0]}
            alt={place.name}
            className="transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent" />
          <Badge className="absolute left-3 top-3 bg-white/85 text-primary backdrop-blur-md">
            {place.category || "Place"}
          </Badge>
          {showFavorite ? (
            <div className="absolute right-3 top-3">
              <FavoriteButton
                id={place.id}
                type="place"
                overlay
                name={place.name}
                image={place.images?.[0]}
                districtSlug={districtSlug}
              />
            </div>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 font-semibold leading-tight">
              {place.name}
            </h3>
            <span className="shrink-0 text-sm font-semibold text-primary">
              {formatCurrency(place.entryfee)}
            </span>
          </div>

          <p className="line-clamp-2 text-sm text-muted-foreground">
            {place.description}
          </p>

          <div className="mt-auto flex items-center justify-between gap-2 pt-1.5">
            <span className="inline-flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{place.district?.name ?? "Karnataka"}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-transform group-hover:translate-x-0.5">
              Get Info <ArrowRight className="size-3.5" />
            </span>
          </div>
        </div>
      </Link>
    </GlassCard>
  );
}

export function PlaceFeatureList({ place }: { place: Place }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="secondary" className="gap-1">
        {formatCurrency(place.entryfee)} entry
      </Badge>
      {place.category ? (
        <Badge variant="secondary" className="capitalize">
          {place.category}
        </Badge>
      ) : null}
      {place.district?.name ? (
        <Badge variant="secondary" className="gap-1">
          <MapPin className="size-3" />
          {place.district.name}
        </Badge>
      ) : null}
    </div>
  );
}
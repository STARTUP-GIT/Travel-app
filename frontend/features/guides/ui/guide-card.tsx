import { ArrowRight, BadgeCheck, Languages, MapPin } from "lucide-react";
import Link from "next/link";

import { AppImage } from "@/components/shared/app-image";
import { FavoriteButton } from "@/components/shared/favorite-button";
import { GlassCard } from "@/components/shared/glass-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { GuideWithContext } from "@/features/guides/types";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function GuideAvatar({
  name,
  image,
  className,
}: {
  name: string;
  image?: string | null;
  className?: string;
}) {
  return (
    <Avatar className={className}>
      {image ? <AvatarImage src={image} alt={name} /> : null}
      <AvatarFallback className="bg-primary/10 font-semibold text-primary">
        {name.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

export function GuideCard({
  guide,
  districtSlug,
  stateSlug,
  className,
  showFavorite = false,
}: {
  guide: GuideWithContext;
  districtSlug: string;
  stateSlug?: string;
  className?: string;
  showFavorite?: boolean;
}) {
  const isSpecific = guide.type === "specific";
  const person = guide.guide;
  const subtitle = isSpecific
    ? guide.place.name
    : `${guide.places.length} places covered`;
  const districtBase = stateSlug ? `/${stateSlug}/${districtSlug}` : `/${districtSlug}`;

  return (
    <GlassCard hover className={cn("group", className)}>
      <Link
        href={`${districtBase}/guides/${person.id}`}
        className="flex flex-1 flex-col gap-3 p-4"
      >
        <div className="flex items-start gap-3">
          <GuideAvatar
            name={person.full_name}
            image={person.profile_pic}
            className="size-14 shrink-0 ring-2 ring-border"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate font-semibold leading-tight">
                {person.full_name}
              </h3>
              <BadgeCheck className="size-4 shrink-0 text-primary" />
            </div>
            <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
              {person.tagline ?? subtitle}
            </p>
            <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
              {typeof person.rating === "number" && person.rating > 0 ? (
                <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                  <span className="text-amber-400">★</span>
                  {person.rating.toFixed(1)}
                </span>
              ) : null}
              <span>{person.experience} yrs exp</span>
            </div>
          </div>
          {showFavorite ? (
            <FavoriteButton
              id={person.id}
              type="guide"
              name={person.full_name}
              image={person.profile_pic}
              districtSlug={districtSlug}
            />
          ) : (
            <Badge variant={isSpecific ? "info" : "success"} className="shrink-0">
              {isSpecific ? "Specific" : "Common"}
            </Badge>
          )}
        </div>

        <p className="line-clamp-2 text-sm text-muted-foreground">
          {person.description ?? "Local expert guide for a memorable Karnataka trip."}
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="gap-1">
            <MapPin className="size-3" />
            {isSpecific ? guide.place.districtName : "Multiple places"}
          </Badge>
          {person.language?.slice(0, 3).map((lang) => (
            <Badge key={lang} variant="secondary" className="gap-1">
              <Languages className="size-3" />
              {lang}
            </Badge>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/70 pt-3">
          <span className="text-sm">
            <span className="font-semibold text-primary">
              {formatCurrency(person.cost)}
            </span>
            <span className="text-muted-foreground"> / booking</span>
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-transform group-hover:translate-x-0.5">
            View & book <ArrowRight className="size-3.5" />
          </span>
        </div>
      </Link>
    </GlassCard>
  );
}

export function GuideHeroImage({ guide }: { guide: GuideWithContext }) {
  const image =
    guide.type === "common"
      ? guide.places.find((p) => p.images?.[0])?.images?.[0]
      : undefined;

  return (
    <div className="aspect-[16/9] w-full overflow-hidden rounded-2xl">
      <AppImage src={image} alt={guide.guide.full_name} />
    </div>
  );
}
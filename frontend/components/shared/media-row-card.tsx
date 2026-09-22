import Link from "next/link";
import { ChevronRight } from "lucide-react";
import * as React from "react";

import { AppImage } from "@/components/shared/app-image";
import { FavoriteButton } from "@/components/shared/favorite-button";
import { Rating } from "@/components/shared/rating";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type MediaRowCardProps = {
  href: string;
  image?: string | null;
  title: string;
  subtitle?: string;
  meta?: string;
  rating?: number | null;
  ratingCount?: number | null;
  badge?: string;
  favorite?: { id: string; type: "place" | "guide" };
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
};

/**
 * Compact horizontal media row — the primary card for home sections and
 * search results. Reused everywhere so the markup stays in one place.
 */
export function MediaRowCard({
  href,
  image,
  title,
  subtitle,
  meta,
  rating,
  ratingCount,
  badge,
  favorite,
  icon,
  children,
  className,
}: MediaRowCardProps) {
  return (
    <div
      className={cn(
        "card-surface card-surface-hover group relative flex items-center gap-3 overflow-hidden rounded-2xl p-3",
        className
      )}
    >
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-3">
        <div className="relative size-[4.5rem] shrink-0 overflow-hidden rounded-xl sm:size-[5.5rem]">
          <AppImage src={image} alt={title} />
          {badge ? (
            <span className="absolute inset-x-0 bottom-0 bg-black/55 px-1.5 py-0.5 text-center text-[0.6rem] font-semibold text-white">
              {badge}
            </span>
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {icon ? <span className="shrink-0 text-primary">{icon}</span> : null}
            <h3 className="truncate text-sm font-semibold leading-tight">{title}</h3>
          </div>
          {subtitle ? (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            {typeof rating === "number" && rating > 0 ? (
              <Rating value={rating} count={ratingCount} size="xs" />
            ) : null}
            {meta ? (
              <span className="text-xs font-medium text-primary">{meta}</span>
            ) : null}
          </div>
          {children}
        </div>
      </Link>
      {favorite ? (
        <div className="shrink-0 self-center">
          <FavoriteButton id={favorite.id} type={favorite.type} />
        </div>
      ) : (
        <ChevronRight className="size-4 shrink-0 text-muted-foreground/70" />
      )}
    </div>
  );
}

export function MediaRowBadge({ children }: { children: React.ReactNode }) {
  return (
    <Badge variant="secondary" className="mt-1 gap-1 px-1.5 py-0">
      {children}
    </Badge>
  );
}
import { ArrowRight, MapPin } from "lucide-react";
import Link from "next/link";

import { AppImage } from "@/components/shared/app-image";
import { GlassCard } from "@/components/shared/glass-card";
import { Rating } from "@/components/shared/rating";
import { Badge } from "@/components/ui/badge";
import type { Hotel } from "@/features/hotels/types";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function HotelCard({
  hotel,
  districtSlug,
  stateSlug,
  className,
}: {
  hotel: Hotel;
  districtSlug: string;
  stateSlug?: string;
  className?: string;
}) {
  const districtBase = stateSlug ? `/${stateSlug}/${districtSlug}` : `/${districtSlug}`;

  return (
    <GlassCard hover className={cn("group", className)}>
      <Link
        href={`${districtBase}/hotels/${hotel.id}`}
        className="flex flex-1 flex-col"
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <AppImage
            src={hotel.images?.[0] ?? hotel.profile_logo}
            alt={hotel.name}
            className="transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent" />
          <Badge className="absolute right-3 top-3 bg-white/85 text-primary backdrop-blur-md">
            {formatCurrency(hotel.cost_per_night)}
            <span className="font-normal text-muted-foreground">/night</span>
          </Badge>
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 font-semibold leading-tight">
              {hotel.name}
            </h3>
            <Rating value={hotel.rating} count={hotel.review?.length} className="shrink-0 text-xs" />
          </div>
          <p className="line-clamp-1 text-sm text-muted-foreground">
            {hotel.address}
          </p>

          <div className="mt-auto flex items-center justify-between gap-2 pt-1.5">
            <span className="inline-flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{hotel.district?.name ?? "Karnataka"}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-transform group-hover:translate-x-0.5">
              View <ArrowRight className="size-3.5" />
            </span>
          </div>
        </div>
      </Link>
    </GlassCard>
  );
}
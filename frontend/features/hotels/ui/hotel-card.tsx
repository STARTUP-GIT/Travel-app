import * as React from "react";
import { ArrowRight, BedSingle, MapPin } from "lucide-react";
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
  const districtBase = stateSlug ? `/${stateSlug}/${districtSlug}` : "/explore";
  const isStay = hotel.property_type === "STAY" || Boolean(hotel.stay_category);

  const { minPrice, pricingUnit } = React.useMemo(() => {
    if (hotel.room_types && hotel.room_types.length > 0) {
      const activeRooms = hotel.room_types.filter((rt) => rt.isActive !== false);
      if (activeRooms.length > 0) {
        const sorted = [...activeRooms].sort((a, b) => a.pricePerNight - b.pricePerNight);
        const cheapest = sorted[0];
        return {
          minPrice: cheapest.pricePerNight,
          pricingUnit: cheapest.pricingUnit === "PER_BED" ? "/bed" : "/night",
        };
      }
    }
    return {
      minPrice: hotel.cost_per_night,
      pricingUnit: isStay ? "/bed" : "/night",
    };
  }, [hotel, isStay]);

  const hasAc = hotel.room_types?.some((rt) => rt.roomType === "AC" && rt.isActive !== false);
  const hasNonAc = hotel.room_types?.some((rt) => rt.roomType === "NON_AC" && rt.isActive !== false);

  return (
    <GlassCard hover className={cn("group flex flex-col", className)}>
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

          {/* Star classification badge or Stays badge */}
          {isStay ? (
            <Badge className="absolute left-3 top-3 border-emerald-500/40 bg-emerald-600/95 text-white backdrop-blur-md flex items-center gap-1 font-semibold text-xs shadow-sm">
              <BedSingle className="size-3.5" />
              {hotel.stay_category
                ? hotel.stay_category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                : "Hostel / Stay"}
            </Badge>
          ) : hotel.star_rating ? (
            <Badge className="absolute left-3 top-3 border-amber-400/40 bg-amber-500/90 text-white backdrop-blur-md">
              {"★".repeat(hotel.star_rating)} {hotel.star_rating}-Star
            </Badge>
          ) : null}

          {/* Price badge */}
          <Badge className="absolute right-3 top-3 bg-white/90 text-primary backdrop-blur-md dark:bg-zinc-900/90 dark:text-primary">
            {formatCurrency(minPrice)}
            <span className="font-normal text-muted-foreground">{pricingUnit}</span>
          </Badge>
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 font-semibold leading-tight">
              {hotel.name}
            </h3>
            <Rating
              value={hotel.rating}
              count={hotel.review?.length}
              className="shrink-0 text-xs"
            />
          </div>
          <p className="line-clamp-1 text-sm text-muted-foreground">
            {hotel.address}
          </p>

          {/* Room types pill preview */}
          {hotel.room_types && hotel.room_types.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <Badge variant="outline" className="text-[0.65rem] font-medium">
                {hotel.room_types.length} {hotel.room_types.length === 1 ? "room type" : "room types"}
              </Badge>
              {hasAc ? (
                <Badge variant="secondary" className="text-[0.65rem]">
                  AC
                </Badge>
              ) : null}
              {hasNonAc ? (
                <Badge variant="secondary" className="text-[0.65rem]">
                  Non-AC
                </Badge>
              ) : null}
            </div>
          ) : null}

          <div className="mt-auto flex items-center justify-between gap-2 pt-2">
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
import { ArrowRight, MapPin, UtensilsCrossed } from "lucide-react";
import Link from "next/link";

import { AppImage } from "@/components/shared/app-image";
import { GlassCard } from "@/components/shared/glass-card";
import { Rating } from "@/components/shared/rating";
import { Badge } from "@/components/ui/badge";
import type { FoodCategory, Restaurent } from "@/features/restaurants/types";
import { cn } from "@/lib/utils";

const FOOD_LABEL: Record<FoodCategory, string> = {
  PUREVEG: "Pure Veg",
  NONVEG: "Non Veg",
  VEG_AND_NONVEG: "Veg & Non-Veg",
};

const FOOD_TONE: Record<FoodCategory, "success" | "warning" | "info"> = {
  PUREVEG: "success",
  NONVEG: "warning",
  VEG_AND_NONVEG: "info",
};

export function RestaurantCard({
  restaurant,
  districtSlug,
  stateSlug,
  className,
}: {
  restaurant: Restaurent;
  districtSlug: string;
  stateSlug?: string;
  className?: string;
}) {
  const districtBase = stateSlug ? `/${stateSlug}/${districtSlug}` : `/${districtSlug}`;

  return (
    <GlassCard hover className={cn("group", className)}>
      <Link
        href={`${districtBase}/restaurants/${restaurant.id}`}
        className="flex flex-1 flex-col"
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <AppImage
            src={restaurant.images?.[0] ?? restaurant.profile_logo}
            alt={restaurant.name}
            className="transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent" />
          <Badge
            variant={FOOD_TONE[restaurant.food_category] ?? "info"}
            className="absolute right-3 top-3 bg-white/85 backdrop-blur-md"
          >
            {FOOD_LABEL[restaurant.food_category] ?? "Multi-cuisine"}
          </Badge>
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 font-semibold leading-tight">
              {restaurant.name}
            </h3>
            <Rating
              value={restaurant.rating}
              count={restaurant.review?.length}
              className="shrink-0 text-xs"
            />
          </div>
          <p className="line-clamp-1 text-sm text-muted-foreground">
            {restaurant.address}
          </p>

          <div className="mt-auto flex items-center justify-between gap-2 pt-1.5">
            <span className="inline-flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{restaurant.district?.name ?? "Karnataka"}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-transform group-hover:translate-x-0.5">
              <UtensilsCrossed className="size-3.5" /> View
              <ArrowRight className="size-3.5" />
            </span>
          </div>
        </div>
      </Link>
    </GlassCard>
  );
}
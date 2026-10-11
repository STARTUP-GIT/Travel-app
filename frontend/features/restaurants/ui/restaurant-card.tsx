import { ArrowRight, CalendarCheck, Clock, GitBranch, MapPin, UtensilsCrossed } from "lucide-react";
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

function formatTime12(time?: string | null): string | null {
  if (!time) return null;
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return time;
  const h = parseInt(match[1], 10);
  const m = match[2];
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${ampm}`;
}

function getOpenStatus(openTime?: string | null, closeTime?: string | null): { isOpen: boolean; label: string } | null {
  if (!openTime || !closeTime) return null;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = openTime.split(":").map(Number);
  const [ch, cm] = closeTime.split(":").map(Number);
  if (isNaN(oh) || isNaN(om) || isNaN(ch) || isNaN(cm)) return null;
  const openMin = oh * 60 + om;
  const closeMin = ch * 60 + cm;
  let isOpen = false;
  if (openMin <= closeMin) {
    isOpen = currentMinutes >= openMin && currentMinutes < closeMin;
  } else {
    // Overnight hours (e.g. 18:00 to 02:00)
    isOpen = currentMinutes >= openMin || currentMinutes < closeMin;
  }
  return {
    isOpen,
    label: isOpen ? "Open now" : "Closed",
  };
}

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
  const districtBase = stateSlug ? `/${stateSlug}/${districtSlug}` : "/explore";
  const openStatus = getOpenStatus(restaurant.opening_time, restaurant.closing_time);
  const formattedHours =
    restaurant.opening_time && restaurant.closing_time
      ? `${formatTime12(restaurant.opening_time)} - ${formatTime12(restaurant.closing_time)}`
      : null;

  return (
    <GlassCard hover className={cn("group flex flex-col", className)}>
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
          
          <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
            <Badge
              variant={FOOD_TONE[restaurant.food_category] ?? "info"}
              className="bg-white/90 text-slate-900 shadow-sm backdrop-blur-md dark:bg-slate-900/90 dark:text-slate-100"
            >
              {FOOD_LABEL[restaurant.food_category] ?? "Multi-cuisine"}
            </Badge>
            {restaurant.booking_enabled ? (
              <Badge
                variant="success"
                className="gap-1 bg-emerald-600/90 text-white shadow-sm backdrop-blur-md"
              >
                <CalendarCheck className="size-3" /> Book Table
              </Badge>
            ) : null}
          </div>

          {openStatus ? (
            <div className="absolute bottom-3 left-3">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold tracking-wide backdrop-blur-md",
                  openStatus.isOpen
                    ? "bg-emerald-500/85 text-white"
                    : "bg-slate-900/75 text-slate-300"
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    openStatus.isOpen ? "animate-pulse bg-white" : "bg-slate-400"
                  )}
                />
                {openStatus.label}
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 font-semibold leading-tight text-foreground">
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

          {formattedHours ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3.5 shrink-0 text-primary" />
              <span>{formattedHours}</span>
            </div>
          ) : null}

          {restaurant.has_branches && (restaurant.branches?.length ?? 0) > 0 ? (
            <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
              <GitBranch className="size-3.5 shrink-0" />
              <span>{(restaurant.branches?.length ?? 0) + 1} locations available</span>
            </div>
          ) : null}

          <div className="mt-auto flex items-center justify-between gap-2 pt-2 border-t border-border/40">
            <span className="inline-flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{restaurant.district?.name ?? "Karnataka"}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-transform group-hover:translate-x-0.5">
              <UtensilsCrossed className="size-3.5" />
              {restaurant.booking_enabled ? "Book / View" : "View"}
              <ArrowRight className="size-3.5" />
            </span>
          </div>
        </div>
      </Link>
    </GlassCard>
  );
}
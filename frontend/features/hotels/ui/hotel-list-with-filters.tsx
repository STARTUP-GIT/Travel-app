"use client";

import * as React from "react";
import {
  ArrowDownUp,
  BedSingle,
  Check,
  Filter,
  Hotel as HotelIcon,
  RotateCcw,
  Sparkles,
  Star,
  Wind,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HotelCard } from "@/features/hotels/ui/hotel-card";
import { EmptyState } from "@/components/shared/states";
import type { Hotel } from "@/features/hotels/types";

type PropertyFilter = "ALL" | "HOTEL" | "STAY";
type AcFilter = "ALL" | "AC" | "NON_AC";
type SortOption = "DEFAULT" | "PRICE_ASC" | "PRICE_DESC" | "RATING_DESC";
type StarFilter = "ALL" | "1" | "2" | "3" | "4" | "5";

function isStayProperty(hotel: Hotel): boolean {
  return hotel.property_type === "STAY" || Boolean(hotel.stay_category);
}

export function HotelListWithFilters({
  hotels,
  districtSlug,
  stateSlug,
  districtName,
}: {
  hotels: Hotel[];
  districtSlug: string;
  stateSlug: string;
  districtName: string;
}) {
  const [propertyFilter, setPropertyFilter] = React.useState<PropertyFilter>("ALL");
  const [acFilter, setAcFilter] = React.useState<AcFilter>("ALL");
  const [sortOption, setSortOption] = React.useState<SortOption>("DEFAULT");
  const [starFilter, setStarFilter] = React.useState<StarFilter>("ALL");

  const hasActiveFilters =
    propertyFilter !== "ALL" ||
    acFilter !== "ALL" ||
    sortOption !== "DEFAULT" ||
    starFilter !== "ALL";

  function resetFilters() {
    setPropertyFilter("ALL");
    setAcFilter("ALL");
    setSortOption("DEFAULT");
    setStarFilter("ALL");
  }

  // Compute lowest room price matching the AC filter for each hotel
  function getMinRoomPrice(hotel: Hotel): number {
    if (!hotel.room_types || hotel.room_types.length === 0) {
      return hotel.cost_per_night;
    }

    let matchingRooms = hotel.room_types.filter((rt) => rt.isActive !== false);
    if (acFilter === "AC") {
      matchingRooms = matchingRooms.filter((rt) => rt.roomType === "AC");
    } else if (acFilter === "NON_AC") {
      matchingRooms = matchingRooms.filter((rt) => rt.roomType === "NON_AC");
    }

    if (matchingRooms.length === 0) {
      return hotel.cost_per_night;
    }

    const prices = matchingRooms.map((rt) => rt.pricePerNight).filter((p) => p >= 0);
    return prices.length > 0 ? Math.min(...prices) : hotel.cost_per_night;
  }

  // Filter and sort hotels
  const filteredHotels = React.useMemo(() => {
    return hotels
      .filter((hotel) => {
        // Accommodation type filter (Hotels vs Stays/Hostels)
        if (propertyFilter === "HOTEL" && isStayProperty(hotel)) {
          return false;
        }
        if (propertyFilter === "STAY" && !isStayProperty(hotel)) {
          return false;
        }

        // Star classification filter
        if (starFilter !== "ALL") {
          const requiredStars = Number(starFilter);
          if (hotel.star_rating !== requiredStars) {
            return false;
          }
        }

        // AC / Non-AC filter
        if (acFilter !== "ALL") {
          if (!hotel.room_types || hotel.room_types.length === 0) {
            // Legacy hotel with no room types
            return true;
          }
          const hasMatchingRoom = hotel.room_types.some(
            (rt) => rt.isActive !== false && rt.roomType === acFilter
          );
          if (!hasMatchingRoom) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOption === "PRICE_ASC") {
          return getMinRoomPrice(a) - getMinRoomPrice(b);
        }
        if (sortOption === "PRICE_DESC") {
          return getMinRoomPrice(b) - getMinRoomPrice(a);
        }
        if (sortOption === "RATING_DESC") {
          return (b.rating ?? 0) - (a.rating ?? 0);
        }
        return 0; // Default order
      });
  }, [hotels, propertyFilter, acFilter, sortOption, starFilter]);

  return (
    <div className="space-y-6">
      {/* FILTER CONTROLS BAR */}
      <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-sm backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">
              <Filter className="size-3.5" /> Filters:
            </span>

            {/* Accommodation Type Filter Pills (Hotel vs Stays) */}
            <div className="inline-flex rounded-xl border border-border bg-muted/40 p-0.5">
              <button
                type="button"
                onClick={() => setPropertyFilter("ALL")}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  propertyFilter === "ALL"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Places
              </button>
              <button
                type="button"
                onClick={() => setPropertyFilter("HOTEL")}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  propertyFilter === "HOTEL"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <HotelIcon className="size-3" /> Hotels
              </button>
              <button
                type="button"
                onClick={() => setPropertyFilter("STAY")}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  propertyFilter === "STAY"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <BedSingle className="size-3" /> Stays & Hostels
              </button>
            </div>

            {/* AC Filter Pills */}
            <div className="inline-flex rounded-xl border border-border bg-muted/40 p-0.5">
              <button
                type="button"
                onClick={() => setAcFilter("ALL")}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  acFilter === "ALL"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Rooms
              </button>
              <button
                type="button"
                onClick={() => setAcFilter("AC")}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  acFilter === "AC"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Wind className="size-3" /> AC
              </button>
              <button
                type="button"
                onClick={() => setAcFilter("NON_AC")}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  acFilter === "NON_AC"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Non-AC
              </button>
            </div>

            {/* Star Classification Dropdown */}
            <Select
              value={starFilter}
              onValueChange={(val: StarFilter) => setStarFilter(val)}
            >
              <SelectTrigger className="h-8 w-36 rounded-xl text-xs">
                <SelectValue placeholder="Star rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Stars</SelectItem>
                <SelectItem value="5">5-Star ★★★★★</SelectItem>
                <SelectItem value="4">4-Star ★★★★</SelectItem>
                <SelectItem value="3">3-Star ★★★</SelectItem>
                <SelectItem value="2">2-Star ★★</SelectItem>
                <SelectItem value="1">1-Star ★</SelectItem>
              </SelectContent>
            </Select>

            {/* Reset Filters button */}
            {hasActiveFilters ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-8 rounded-xl text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="size-3 mr-1" /> Reset
              </Button>
            ) : null}
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">Sort by:</span>
            <Select
              value={sortOption}
              onValueChange={(val: SortOption) => setSortOption(val)}
            >
              <SelectTrigger className="h-8 w-44 rounded-xl text-xs">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DEFAULT">Recommended</SelectItem>
                <SelectItem value="PRICE_ASC">Price: Low to High</SelectItem>
                <SelectItem value="PRICE_DESC">Price: High to Low</SelectItem>
                <SelectItem value="RATING_DESC">Guest Rating: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results summary bar */}
        <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5 text-xs text-muted-foreground">
          <span>
            Showing <strong className="text-foreground">{filteredHotels.length}</strong> of{" "}
            {hotels.length} accommodations in {districtName}
          </span>
          {hasActiveFilters ? (
            <span className="text-[0.7rem] text-primary font-medium">
              Filters applied
            </span>
          ) : null}
        </div>
      </div>

      {/* HOTEL LIST */}
      {filteredHotels.length === 0 ? (
        <EmptyState
          icon={propertyFilter === "STAY" ? BedSingle : HotelIcon}
          title={
            propertyFilter === "STAY"
              ? "No hostels or stays match your filters"
              : propertyFilter === "HOTEL"
              ? "No hotels match your filters"
              : "No accommodations match your filters"
          }
          description="Try broadening your criteria or resetting filters to view all available options."
          action={
            hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={resetFilters} className="rounded-xl mt-2">
                <RotateCcw className="size-3.5 mr-1.5" /> Clear all filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredHotels.map((hotel) => (
            <HotelCard
              key={hotel.id}
              hotel={hotel}
              districtSlug={districtSlug}
              stateSlug={stateSlug}
            />
          ))}
        </div>
      )}
    </div>
  );
}

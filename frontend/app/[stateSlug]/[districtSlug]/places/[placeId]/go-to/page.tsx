"use client";

import * as React from "react";
import { motion } from "motion/react";
import { ArrowLeft, CarTaxiFront, Compass, MapPin, Navigation } from "lucide-react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { ScreenHeader } from "@/components/shared/screen-header";
import { Button } from "@/components/ui/button";
import { usePlace } from "@/features/places/hooks/usePlaces";
import { MapEmbed } from "@/features/maps/ui/map-embed";
import { MapActionButtons } from "@/features/maps/ui/map-action-buttons";
import { haversineMeters, parsePoint, type GeoPoint } from "@/features/maps/lib/geo";

export default function GoToPlacePage() {
  const params = useParams<{ stateSlug: string; districtSlug: string; placeId: string }>();
  const stateSlug = params.stateSlug;
  const districtSlug = params.districtSlug;
  const placeId = params.placeId;
  const districtBase = `/${stateSlug}/${districtSlug}`;
  const placeHref = `${districtBase}/places/${placeId}`;

  const { data: place, isLoading } = usePlace(placeId ? districtSlug : undefined, placeId);
  const [userLocation, setUserLocation] = React.useState<GeoPoint | null>(null);

  React.useEffect(() => {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        () => {},
        { timeout: 5000, maximumAge: 60000 }
      );
    }
  }, []);

  const destPoint = place ? parsePoint(place) : null;
  const distanceKm =
    destPoint && userLocation
      ? (haversineMeters(userLocation, destPoint) / 1000).toFixed(1)
      : null;

  return (
    <div className="pb-8">
      <ScreenHeader
        title={`Navigate to ${place?.name ?? "Place"}`}
        subtitle="Get live directions & map view"
        backHref={placeHref}
      />

      <div className="app-container mt-4 space-y-6">
        {isLoading ? (
          <div className="card-surface flex h-64 items-center justify-center rounded-3xl text-sm text-muted-foreground">
            Loading place location details…
          </div>
        ) : !place ? (
          <div className="card-surface rounded-3xl p-6 text-center text-sm text-muted-foreground">
            Place details could not be loaded.
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            {/* Map Preview with Red Marker */}
            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
              <MapEmbed point={place} userPoint={userLocation} label={place.name} height={320} />
            </div>

            {/* Destination Info & Distance Pill */}
            <div className="card-surface rounded-3xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    <MapPin className="size-3.5" /> Destination
                  </span>
                  <h2 className="mt-1.5 text-xl font-bold tracking-tight">{place.name}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {place.district?.name ?? "Karnataka"}
                    {destPoint ? ` · ${destPoint.latitude.toFixed(4)}, ${destPoint.longitude.toFixed(4)}` : ""}
                  </p>
                </div>
                {distanceKm ? (
                  <div className="flex flex-col items-end rounded-2xl bg-primary/10 px-3 py-2 text-primary">
                    <span className="text-sm font-bold">{distanceKm} km</span>
                    <span className="text-[0.65rem] uppercase tracking-wider font-semibold">Away</span>
                  </div>
                ) : null}
              </div>

              {destPoint ? (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Click <span className="font-semibold text-foreground">Get Directions</span> below to open Google Maps with {place.name} pre-set as your destination.
                </p>
              ) : (
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  Exact location coordinates are missing for this place.
                </p>
              )}
            </div>

            {/* Navigation Actions */}
            <MapActionButtons point={place} label={place.name} />

            {/* Navigation Secondary Links */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button asChild variant="outline" size="lg" className="rounded-2xl">
                <Link href={placeHref}>
                  <ArrowLeft className="size-4" /> Place Details
                </Link>
              </Button>
              <Button asChild variant="action" size="lg" className="rounded-2xl">
                <Link href={`${districtBase}/guides`}>
                  <Compass className="size-4" /> Book Guide
                </Link>
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}


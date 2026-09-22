"use client";

import * as React from "react";

import { buildEmbedUrl, type GeoPoint } from "@/features/maps/lib/geo";
import { cn } from "@/lib/utils";

/**
 * Embedded map with a provider seam. Uses OpenStreetMap (keyless) by default;
 * a credentialed provider (Google/Mapbox) can be wired through MapConfig
 * without changing this component's contract.
 */
export function MapEmbed({
  point,
  label = "",
  height = 260,
  className,
}: {
  point: GeoPoint;
  label?: string;
  height?: number;
  className?: string;
}) {
  if (
    typeof point.latitude !== "number" ||
    typeof point.longitude !== "number" ||
    !Number.isFinite(point.latitude) ||
    !Number.isFinite(point.longitude) ||
    (point.latitude === 0 && point.longitude === 0)
  ) {
    return (
      <div
        className={cn(
          "flex w-full items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 p-8 text-center text-sm text-muted-foreground",
          className
        )}
        style={{ height }}
      >
        Location is not available for this place yet.
      </div>
    );
  }

  const src = buildEmbedUrl(
    { latitude: point.latitude, longitude: point.longitude },
    label ? 15 : 15
  );

  return (
    <div
      className={cn("relative w-full overflow-hidden rounded-2xl border border-border bg-card", className)}
      style={{ height }}
    >
      <iframe
        title={`Map of ${label || point.latitude.toFixed(4) + ", " + point.longitude.toFixed(4)}`}
        src={src}
        className="size-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
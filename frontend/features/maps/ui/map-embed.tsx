"use client";

import * as React from "react";

import { buildEmbedUrl, parsePoint, type GeoPoint } from "@/features/maps/lib/geo";
import { cn } from "@/lib/utils";

/**
 * Embedded map with a provider seam. Displays the destination using real saved coordinates
 * with a red marker badge and optional distinct user location indicator.
 */
export function MapEmbed({
  point,
  userPoint,
  label = "",
  height = 260,
  className,
}: {
  point: GeoPoint;
  userPoint?: GeoPoint | null;
  label?: string;
  height?: number;
  className?: string;
}) {
  const parsedPoint = parsePoint(point);
  const parsedUser = userPoint ? parsePoint(userPoint) : null;

  if (!parsedPoint) {
    return (
      <div
        className={cn(
          "flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground",
          className
        )}
        style={{ height }}
      >
        <span className="mb-1 text-base font-semibold text-foreground">Location coordinates unavailable</span>
        <span>Exact coordinates have not been configured for this place yet.</span>
      </div>
    );
  }

  const src = buildEmbedUrl(parsedPoint, 15, parsedUser);

  return (
    <div
      className={cn("relative w-full overflow-hidden rounded-2xl border border-border bg-card", className)}
      style={{ height }}
    >
      <iframe
        title={`Map of ${label || parsedPoint.latitude.toFixed(4) + ", " + parsedPoint.longitude.toFixed(4)}`}
        src={src}
        className="size-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <div className="absolute top-2 left-2 z-10 flex flex-wrap items-center gap-2">
        {/* Destination Badge with prominent red marker */}
        <div className="flex items-center gap-1.5 rounded-full bg-background/90 backdrop-blur-md px-3 py-1 shadow-md border border-border text-xs font-semibold">
          <span className="relative flex size-2.5">
            <span className="animate-ping absolute inline-flex size-full rounded-full bg-red-500 opacity-75"></span>
            <span className="relative inline-flex size-2.5 rounded-full bg-red-600"></span>
          </span>
          <span className="text-foreground">{label || "Destination"}</span>
        </div>

        {/* Distinct User Location Badge */}
        {parsedUser ? (
          <div className="flex items-center gap-1.5 rounded-full bg-background/90 backdrop-blur-md px-3 py-1 shadow-md border border-blue-200 text-xs font-semibold">
            <span className="relative flex size-2.5">
              <span className="relative inline-flex size-2.5 rounded-full bg-blue-600"></span>
            </span>
            <span className="text-blue-700 dark:text-blue-300">Your Location</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
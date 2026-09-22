"use client";

import { ExternalLink, Navigation } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  validPoint,
  buildDirectionsUrl,
  buildOpenUrl,
  type GeoPoint,
} from "@/features/maps/lib/geo";

/**
 * Gets the user to the destination through the phone's map app(s). Both
 * actions are real deep links derived from the backend coordinates.
 */
export function MapActionButtons({
  point,
  label = "",
}: {
  point: GeoPoint;
  label?: string;
}) {
  const isValid = validPoint(point);

  return (
    <div className="grid grid-cols-2 gap-2">
      <Button asChild variant="action" className="rounded-xl" disabled={!isValid}>
        <a
          href={isValid ? buildDirectionsUrl(point) : undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!isValid}
        >
          <Navigation className="size-4" /> Get Directions
        </a>
      </Button>
      <Button asChild variant="outline" className="rounded-xl" disabled={!isValid}>
        <a
          href={isValid ? buildOpenUrl(point, label) : undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!isValid}
        >
          <ExternalLink className="size-4" /> Open in Maps
        </a>
      </Button>
    </div>
  );
}
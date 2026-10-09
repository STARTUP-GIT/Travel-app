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

  const handleDirectionsClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isValid) return;
    if ("geolocation" in navigator && !userLocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const origin = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          window.open(buildDirectionsUrl(point, origin), "_blank", "noopener,noreferrer");
        },
        () => {
          window.open(buildDirectionsUrl(point), "_blank", "noopener,noreferrer");
        },
        { timeout: 3000 }
      );
      e.preventDefault();
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <Button asChild variant="action" className="rounded-xl" disabled={!isValid}>
        <a
          href={isValid ? buildDirectionsUrl(point, userLocation ?? undefined) : undefined}
          onClick={handleDirectionsClick}
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
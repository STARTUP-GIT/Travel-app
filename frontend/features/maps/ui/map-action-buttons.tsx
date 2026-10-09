"use client";

import { ExternalLink, Navigation } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  parsePoint,
  validPoint,
  buildDirectionsUrl,
  buildOpenUrl,
  type GeoPoint,
} from "@/features/maps/lib/geo";

/**
 * Gets the user to the destination through Google Maps / external map app.
 * Both actions are derived cleanly from saved place coordinates with user origin fallback.
 */
export function MapActionButtons({
  point,
  label = "",
}: {
  point: GeoPoint;
  label?: string;
}) {
  const destPoint = parsePoint(point);
  const isValid = destPoint !== null;
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

  const handleDirectionsClick = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    e.preventDefault();
    if (!destPoint) {
      toast.error("Location coordinates are missing for this place.");
      return;
    }

    if (userLocation) {
      window.open(buildDirectionsUrl(destPoint, userLocation, label), "_blank", "noopener,noreferrer");
      return;
    }

    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const origin = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          setUserLocation(origin);
          window.open(buildDirectionsUrl(destPoint, origin, label), "_blank", "noopener,noreferrer");
        },
        () => {
          // Permission denied or timeout: origin=My+Location ensures Google Maps pre-fills origin to My Location
          window.open(buildDirectionsUrl(destPoint, null, label), "_blank", "noopener,noreferrer");
        },
        { timeout: 3000 }
      );
    } else {
      window.open(buildDirectionsUrl(destPoint, null, label), "_blank", "noopener,noreferrer");
    }
  };

  const handleOpenMapsClick = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    e.preventDefault();
    if (!destPoint) {
      toast.error("Location coordinates are missing for this place.");
      return;
    }
    window.open(buildOpenUrl(destPoint, label), "_blank", "noopener,noreferrer");
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        variant="action"
        className="rounded-xl"
        disabled={!isValid}
        onClick={handleDirectionsClick}
      >
        <Navigation className="size-4" /> Get Directions
      </Button>
      <Button
        variant="outline"
        className="rounded-xl"
        disabled={!isValid}
        onClick={handleOpenMapsClick}
      >
        <ExternalLink className="size-4" /> Open in Maps
      </Button>
    </div>
  );
}
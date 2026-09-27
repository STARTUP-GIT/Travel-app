"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import {
  isGoogleMapsConfigured,
  loadGoogleMaps,
  type GoogleMapsLibrary,
} from "@/lib/google-maps/loader";
import type { Coordinate, TripPoint } from "../types";
import { MapConfig, RouteColors } from "../constants/theme";
import { TrackCanvas } from "./track-canvas";

/**
 * Google Maps view for the Path Tracker.
 *
 * This component is presentation only. It plots coordinates that the Path
 * Tracker engine has already produced and it deliberately enables **no** Google
 * location features (no `google.maps.GeolocationMarker`, no map-click
 * geolocation), so the app keeps exactly one location watcher — the Path
 * Tracker's own. No GPS, distance, timer, movement or state-transition logic
 * lives here.
 *
 * Behaviour by configuration:
 *   - no key configured -> renders the existing `TrackCanvas`, unchanged
 *   - key configured     -> renders a Google Map with the recorded path
 * A blank key is therefore a supported state, not a crash.
 */
export function GoogleTripMap({
  points,
  currentPosition,
  returnCorridor,
  recording,
  apiKey,
  className,
}: {
  points: TripPoint[];
  currentPosition: Coordinate | null;
  returnCorridor: Coordinate[] | null;
  recording: boolean;
  apiKey: string;
  className?: string;
}) {
  const [maps, setMaps] = React.useState<GoogleMapsLibrary | null>(null);
  const [status, setStatus] = React.useState<"loading" | "ready" | "missing-key" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<google.maps.Map | null>(null);
  const pathRef = React.useRef<google.maps.Polyline | null>(null);
  const corridorRef = React.useRef<google.maps.Polyline | null>(null);
  const startMarkerRef = React.useRef<google.maps.Marker | null>(null);
  const currentMarkerRef = React.useRef<google.maps.Marker | null>(null);
  const didCentreRef = React.useRef(false);
  const lastFollowRef = React.useRef(0);

  React.useEffect(() => {
    let cancelled = false;
    if (!isGoogleMapsConfigured(apiKey)) {
      setStatus("missing-key");
      return;
    }
    void loadGoogleMaps(apiKey).then((result) => {
      if (cancelled) return;
      if (result.status === "missing-key") {
        setStatus("missing-key");
        return;
      }
      if (result.status === "error") {
        setStatus("error");
        setErrorMessage(result.message);
        return;
      }
      setStatus("ready");
      setMaps(result.maps);
    });
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  // Create the map exactly once per Maps instance.
  React.useEffect(() => {
    if (!maps || !containerRef.current || mapRef.current) return;
    const first = points[0] ?? currentPosition;
    const centre = first ?? { latitude: 0, longitude: 0 };

    mapRef.current = new maps.Map(containerRef.current, {
      center: { lat: centre.latitude, lng: centre.longitude },
      zoom: MapConfig.defaultZoom,
      disableDefaultUI: true,
      zoomControl: true,
      clickableIcons: false,
      gestureHandling: "greedy",
    });

    pathRef.current = new maps.Polyline({
      map: mapRef.current,
      zIndex: 2,
      strokeColor: RouteColors.recorded,
      strokeOpacity: 1,
      strokeWeight: 5,
      geodesic: true,
    });
    corridorRef.current = new maps.Polyline({
      map: mapRef.current,
      zIndex: 1,
      strokeColor: RouteColors.returnRoute,
      strokeOpacity: 0.9,
      strokeWeight: 4,
      geodesic: true,
      icons: [
        {
          icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 2 },
          offset: "50%",
        },
      ],
    });
    startMarkerRef.current = new maps.Marker({
      map: mapRef.current,
      zIndex: 4,
      title: "Trip start",
      label: { text: "S", color: "#ffffff", fontWeight: "700" },
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 7,
        fillColor: RouteColors.start,
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      },
    });
    currentMarkerRef.current = new maps.Marker({
      map: mapRef.current,
      zIndex: 5,
      title: "Current position",
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: RouteColors.destination,
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 3,
      },
    });

    return () => {
      // Full teardown: no map, overlays or markers outlive the component.
      startMarkerRef.current?.setMap(null);
      currentMarkerRef.current?.setMap(null);
      pathRef.current?.setMap(null);
      corridorRef.current?.setMap(null);
      startMarkerRef.current = null;
      currentMarkerRef.current = null;
      pathRef.current = null;
      corridorRef.current = null;
      mapRef.current = null;
    };
    // Created once per Maps instance only. Depending on the path here would
    // tear the map down and rebuild it on every GPS fix.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maps]);

  // Push engine data into the overlays.
  React.useEffect(() => {
    if (!mapRef.current) return;
    const path = points.map((p) => ({ lat: p.latitude, lng: p.longitude }));
    pathRef.current?.setPath(path);

    const corridor = returnCorridor?.map((c) => ({ lat: c.latitude, lng: c.longitude }));
    corridorRef.current?.setPath(corridor ?? []);

    const start = points[0];
    if (start) {
      startMarkerRef.current?.setPosition({ lat: start.latitude, lng: start.longitude });
      startMarkerRef.current?.setVisible(true);
    } else {
      startMarkerRef.current?.setVisible(false);
    }

    if (currentPosition) {
      currentMarkerRef.current?.setPosition({
        lat: currentPosition.latitude,
        lng: currentPosition.longitude,
      });
      currentMarkerRef.current?.setVisible(true);
    } else {
      currentMarkerRef.current?.setVisible(false);
    }

    // Centre once on the first real position, then follow the live position
    // using the original MapConfig throttle. This is camera movement only —
    // it does not request or read any location.
    if (currentPosition) {
      if (!didCentreRef.current) {
        mapRef.current.setCenter({
          lat: currentPosition.latitude,
          lng: currentPosition.longitude,
        });
        mapRef.current.setZoom(MapConfig.defaultZoom);
        didCentreRef.current = true;
        return;
      }
      const now = Date.now();
      const last = lastFollowRef.current;
      if (last === 0 || now - last >= MapConfig.cameraUpdateThrottleMs) {
        lastFollowRef.current = now;
        mapRef.current.panTo({
          lat: currentPosition.latitude,
          lng: currentPosition.longitude,
        });
      }
    }
  }, [maps, points, currentPosition, returnCorridor, recording]);

  // Still loading, or not configured: keep the exact pre-existing Path Tracker
  // view, so a blank key or a slow Maps load never breaks the screen.
  if (status === "loading" || status === "missing-key") {
    return (
      <TrackCanvas
        points={points}
        currentPosition={currentPosition}
        returnCorridor={returnCorridor}
        recording={recording}
      />
    );
  }

  if (status === "error") {
    return (
      <div
        className={cn(
          "flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card p-4 text-center",
          className
        )}
      >
        <p className="text-sm font-semibold">Map unavailable</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          {errorMessage ?? "Google Maps could not be loaded."}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("aspect-[16/10] w-full overflow-hidden rounded-2xl", className)}
      aria-label="Trip map"
    />
  );
}

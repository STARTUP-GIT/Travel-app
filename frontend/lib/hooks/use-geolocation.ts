"use client";

import * as React from "react";

export type GeoSnapshot = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  timestamp: number;
};

type GeolocationState = {
  supported: boolean;
  status: "idle" | "prompt" | "active" | "error";
  position: GeoSnapshot | null;
  error: string | null;
};

/**
 * Thin wrapper over the browser Geolocation API. Real device GPS only —
 * this hook never fabricates coordinates. Callers must degrade gracefully
 * where the API is unavailable or permission is denied.
 */
export function useGeolocation(options?: PositionOptions) {
  const [state, setState] = React.useState<GeolocationState>({
    supported: typeof navigator !== "undefined" && "geolocation" in navigator,
    status: "idle",
    position: null,
    error: null,
  });

  const watchId = React.useRef<number | null>(null);

  const start = React.useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setState((s) => ({ ...s, status: "error", error: "Location is not supported on this device." }));
      return;
    }
    setState((s) => ({ ...s, status: "prompt", error: null }));

    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setState({
          supported: true,
          status: "active",
          position: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            speed: pos.coords.speed,
            timestamp: pos.timestamp,
          },
          error: null,
        });
      },
      (err) => {
        setState((s) => ({
          ...s,
          status: "error",
          error: err.message ?? "Unable to determine your location.",
        }));
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000, ...options }
    );
  }, [options]);

  const stop = React.useCallback(() => {
    if (watchId.current !== null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setState((s) => ({ ...s, status: "idle" }));
  }, []);

  React.useEffect(() => stop, [stop]);

  return { ...state, start, stop };
}

/** One-shot current position, resolves with null on failure. */
export async function getCurrentPosition(): Promise<GeoSnapshot | null> {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) return null;
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 30000,
      })
    );
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      speed: pos.coords.speed,
      timestamp: pos.timestamp,
    };
  } catch {
    return null;
  }
}
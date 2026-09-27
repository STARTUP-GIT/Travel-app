/**
 * Single Google Maps JavaScript API loader for the customer frontend.
 *
 * There is exactly one loader for the whole app: the script tag is inserted at
 * most once and every caller awaits the same cached promise, so navigating
 * between pages (or mounting several map components) can never load Maps twice
 * or race each other.
 *
 * Configuration
 * -------------
 * The key comes from the environment only and is never hardcoded. It is read
 * once on the server — `process.env.GOOGLE_MAPS_API_KEY` in the page component,
 * where private variables *are* readable — and passed in here.
 *
 * That is deliberate: this file is client code, and Next.js strips every
 * variable that is not `NEXT_PUBLIC_*` from the browser bundle, so reading
 * `process.env.GOOGLE_MAPS_API_KEY` here would always be `undefined` and the
 * map would silently never load. Passing the key down as a prop keeps a single
 * source of truth (no duplicated `NEXT_PUBLIC_` variable that can drift out of
 * sync) and is safe because a Google Maps browser key is public by design — it
 * has to reach the browser to load the script at all.
 *
 * The same Google Cloud key also serves the future Android app through the Maps
 * SDK for Android; the Path-Tracker Expo config plugin already injects a key of
 * that name into AndroidManifest. One key, both platforms — the key
 * restrictions in Google Cloud decide which APIs it may serve.
 *
 * Empty key
 * ---------
 * An unset/blank key is a supported state, not an error. `loadGoogleMaps()`
 * resolves to a `missing-key` outcome and never throws, so pages can render
 * their own empty state during development instead of crashing.
 */

/**
 * The parts of the Maps JS API this app uses: `Map` and `Polyline` come from
 * the `maps` library, `Marker` from the separate `marker` library. They are
 * merged into one flat object so callers get a single `maps.*` namespace.
 *
 * Obtained via `google.maps.importLibrary(...)` rather than reading
 * `google.maps` directly: with `loading=async` the namespace is a lazy proxy,
 * so its classes are not constructable until the libraries are resolved.
 */
export type GoogleMapsLibrary = Awaited<
  ReturnType<typeof google.maps.importLibrary<"maps">>
> &
  Awaited<ReturnType<typeof google.maps.importLibrary<"marker">>>;

/** Outcome of a Maps load attempt. */
export type GoogleMapsLoadResult =
  | { status: "ready"; maps: GoogleMapsLibrary }
  | { status: "missing-key" }
  | { status: "error"; message: string };

const SCRIPT_ID = "google-maps-js-api";
const SCRIPT_SRC = "https://maps.googleapis.com/maps/api/js";

/** How long to wait for the Maps bootstrap to expose `importLibrary`. */
const LIBRARY_READY_TIMEOUT_MS = 10_000;
const LIBRARY_POLL_MS = 50;

declare global {
  interface Window {
    /**
     * Present only once the Maps script has loaded, which is why every read of
     * `window.google` in this file is optional-chained. Declared here because
     * `@types/google.maps` declares the `google` namespace but does not attach
     * it to `Window`.
     */
    google: typeof google;
  }
}

/** True when a key is present, i.e. Maps can actually be requested. */
export function isGoogleMapsConfigured(apiKey: string | null | undefined): boolean {
  return (apiKey ?? "").trim().length > 0;
}

let inflight: Promise<GoogleMapsLoadResult> | null = null;

/**
 * Load the Maps JavaScript API exactly once per page.
 *
 * Safe to call from many components: the first call performs the work and every
 * later call receives the same result.
 */
export function loadGoogleMaps(apiKey: string | null | undefined): Promise<GoogleMapsLoadResult> {
  if (inflight) return inflight;
  inflight = new Promise<GoogleMapsLoadResult>((resolve) => {
    const key = (apiKey ?? "").trim();
    if (!key) {
      resolve({ status: "missing-key" });
      return;
    }

    if (typeof window === "undefined") {
      // The Maps JS API is browser-only. Resolve rather than throw so a
      // server render degrades to the caller's empty state.
      resolve({
        status: "error",
        message: "Google Maps can only load in the browser.",
      });
      return;
    }

    /**
     * Turn a loaded script into the resolved library.
     *
     * Two things must be waited for, in order:
     *  1. `google.maps.importLibrary` to exist. The script's `load` event can
     *     fire while `google` is still only a bootstrap stub, and calling
     *     `importLibrary` then throws — which is what produced
     *     "Map is not a constructor" and a silent "could not be initialised".
     *  2. `importLibrary` itself, which is the supported entry point for
     *     `loading=async` and resolves the real classes.
     */
    const resolveLibrary = async (): Promise<void> => {
      const deadline = Date.now() + LIBRARY_READY_TIMEOUT_MS;
      while (
        typeof window.google?.maps?.importLibrary !== "function" &&
        Date.now() < deadline
      ) {
        await new Promise((r) => setTimeout(r, LIBRARY_POLL_MS));
      }

      const importLibrary = window.google?.maps?.importLibrary;
      if (typeof importLibrary !== "function") {
        resolve({
          status: "error",
          message: "Google Maps loaded but its map library could not be initialised.",
        });
        return;
      }

      try {
        const [mapsLib, markerLib] = await Promise.all([
          importLibrary("maps"),
          importLibrary("marker"),
        ]);
        resolve({ status: "ready", maps: { ...mapsLib, ...markerLib } });
      } catch {
        resolve({
          status: "error",
          message: "Google Maps loaded but its map library could not be initialised.",
        });
      }
    };

    // Already present (e.g. another copy of the script, or a previous mount
    // that already finished) — adopt it instead of adding a second tag.
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      if (window.google?.maps) {
        void resolveLibrary();
        return;
      }
      existing.addEventListener("load", () => void resolveLibrary());
      existing.addEventListener("error", () => {
        resolve({
          status: "error",
          message: "Google Maps failed to load. Check the API key and that the Maps JavaScript API is enabled.",
        });
      });
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.defer = true;
    // `loading=async` lets the API surface failures through the script's own
    // error event instead of hanging.
    script.src = `${SCRIPT_SRC}?key=${encodeURIComponent(key)}&loading=async`;

    script.addEventListener("load", () => void resolveLibrary());
    script.addEventListener("error", () => {
      resolve({
        status: "error",
        message:
          "Google Maps failed to load. Check the API key and that the Maps JavaScript API is enabled for it.",
      });
    });

    document.head.appendChild(script);
  });

  return inflight;
}

/**
 * Drop the cached result. Only needed by tests or a full page reset; normal
 * navigation must not call this, or the singleton guarantee is lost.
 */
export function resetGoogleMapsLoaderForTests(): void {
  inflight = null;
  document.getElementById(SCRIPT_ID)?.remove();
}

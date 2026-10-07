/**
 * District context.
 *
 * Almost every screen below `/d/:stateSlug/:districtSlug` needs the same three
 * things: the district's real id, its full record, and its listings. Without this
 * provider each screen would independently resolve the slug, re-request the same
 * lists, and risk disagreeing about what "the current district" is.
 *
 * The slug in the URL is human-readable; the id is what every backend route
 * requires. Resolution happens once here, and screens that receive no id treat
 * it as a programming error rather than falling back to a hardcoded district.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { KEYS, storage } from "@/lib/storage/local-store";
import {
  getApprovedPlaces,
  getHotelsForDistrict,
  getRestaurantsForDistrict,
} from "@/services/places.service";
import {
  listDistrictGuideDirectory,
  type DistrictGuideDirectory,
} from "@/services/guides.service";
import { resolveDistrictBySlug, type DistrictSummary } from "@/services/locations.service";
import type { Hotel, Place, Restaurent } from "@/types/api";

export type DistrictStatus = "idle" | "loading" | "ready" | "not-found" | "error";

type DistrictValue = {
  district: DistrictSummary | null;
  status: DistrictStatus;
  error: string | null;
  places: Place[];
  hotels: Hotel[];
  restaurants: Restaurent[];
  guides: DistrictGuideDirectory;
  reload: () => void;
  /** Refreshes listings without re-resolving the district. */
  refreshListings: () => void;
};

const EMPTY_DIRECTORY: DistrictGuideDirectory = { guides: [], packages: [] };

const DistrictContext = createContext<DistrictValue | null>(null);

export function DistrictProvider({
  districtSlug,
  children,
}: {
  districtSlug: string;
  children: React.ReactNode;
}) {
  const [district, setDistrict] = useState<DistrictSummary | null>(null);
  const [status, setStatus] = useState<DistrictStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const [places, setPlaces] = useState<Place[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurent[]>([]);
  const [guides, setGuides] = useState<DistrictGuideDirectory>(EMPTY_DIRECTORY);

  const [reloadToken, setReloadToken] = useState(0);
  const [listingsToken, setListingsToken] = useState(0);

  /* ---------------------------------------------------------------------- */
  /* Resolve the district from the URL slug                                  */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setStatus("loading");
      setError(null);

      try {
        const resolved = await resolveDistrictBySlug(districtSlug);
        if (cancelled) return;

        if (!resolved) {
          // Not an error — the slug may simply not exist, or the admin may have
          // disabled the district since the link was shared.
          setDistrict(null);
          setStatus("not-found");
          return;
        }

        setDistrict(resolved);
        setStatus("ready");
        // Remembered as the full route so the landing screen can resume here
        // without first having to resolve the state slug.
        await storage.writeString(
          KEYS.lastDistrict,
          `${resolved.state?.slug ?? "india"}/${resolved.slug}`,
        );
      } catch (cause) {
        if (cancelled) return;
        setStatus("error");
        setError(
          cause instanceof Error && cause.message
            ? cause.message
            : "We couldn't load this destination.",
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [districtSlug, reloadToken]);

  /* ---------------------------------------------------------------------- */
  /* Load the district's listings                                           */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (status !== "ready" || !district) return;

    let cancelled = false;

    (async () => {
      const id = district.id;
      const [nextPlaces, nextHotels, nextRestaurants, nextGuides] = await Promise.all([
        getApprovedPlaces(id).catch(() => [] as Place[]),
        getHotelsForDistrict(id).catch(() => [] as Hotel[]),
        getRestaurantsForDistrict(id).catch(() => [] as Restaurent[]),
        listDistrictGuideDirectory(id).catch(() => EMPTY_DIRECTORY),
      ]);

      if (cancelled) return;

      setPlaces(nextPlaces);
      setHotels(nextHotels);
      setRestaurants(nextRestaurants);
      setGuides(nextGuides);
    })();

    return () => {
      cancelled = true;
    };
  }, [district, status, listingsToken]);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);
  const refreshListings = useCallback(() => setListingsToken((n) => n + 1), []);

  const value = useMemo<DistrictValue>(
    () => ({
      district,
      status,
      error,
      places,
      hotels,
      restaurants,
      guides,
      reload,
      refreshListings,
    }),
    [district, status, error, places, hotels, restaurants, guides, reload, refreshListings],
  );

  return <DistrictContext.Provider value={value}>{children}</DistrictContext.Provider>;
}

export function useDistrict(): DistrictValue {
  const value = useContext(DistrictContext);
  if (!value) {
    throw new Error("useDistrict must be used inside a district route");
  }
  return value;
}

/**
 * The district's real id.
 *
 * Throws when absent rather than returning a placeholder: every backend route is
 * mounted under `/:districtId`, so a wrong id silently queries the wrong
 * district's data — exactly the bug this prevents.
 */
export function useDistrictId(): string {
  const { district } = useDistrict();
  if (!district) {
    throw new Error("District is not resolved yet");
  }
  return district.id;
}
/**
 * Saved items (favourites).
 *
 * The backend models `user_fav_place` but publishes no endpoint for reading or
 * writing favourites, so — exactly like the customer web frontend — these are
 * persisted on the device together with a small snapshot of each item. The
 * snapshot is what lets the Saved screen render a title and thumbnail without
 * re-fetching every place, and means a saved place still shows something useful
 * when the network is unavailable.
 *
 * This module is the single seam. If public favourite endpoints are ever added,
 * only this file changes; no screen imports the storage layer directly.
 */

import { KEYS, storage } from "@/lib/storage/local-store";

export type FavoriteTarget = "place" | "guide";

export type FavoriteSnapshot = {
  id: string;
  name?: string;
  subtitle?: string;
  image?: string;
  /** District slug, so a saved card can link back into the right district. */
  districtSlug?: string;
  savedAt?: string;
};

export type FavoritesState = {
  places: FavoriteSnapshot[];
  guides: FavoriteSnapshot[];
};

export type FavoriteToggleResult = {
  state: FavoritesState;
  added: boolean;
};

export const EMPTY_FAVORITES: FavoritesState = { places: [], guides: [] };

function bucket(state: FavoritesState, target: FavoriteTarget): FavoriteSnapshot[] {
  return target === "place" ? state.places : state.guides;
}

/**
 * Accepts the legacy shape (bare id strings, written by an older build) and
 * upgrades it in place, so an upgrade never wipes a user's saved list.
 */
function normalize(list: unknown): FavoriteSnapshot[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((entry) => Boolean(entry))
    .map((entry): FavoriteSnapshot | null => {
      if (typeof entry === "string") return { id: entry };
      if (typeof entry !== "object") return null;

      const raw = entry as Partial<FavoriteSnapshot>;
      const id = String(raw.id ?? "");
      if (!id) return null;

      return {
        id,
        name: typeof raw.name === "string" ? raw.name : undefined,
        subtitle: typeof raw.subtitle === "string" ? raw.subtitle : undefined,
        image: typeof raw.image === "string" ? raw.image : undefined,
        districtSlug: typeof raw.districtSlug === "string" ? raw.districtSlug : undefined,
        savedAt: typeof raw.savedAt === "string" ? raw.savedAt : undefined,
      };
    })
    .filter((entry): entry is FavoriteSnapshot => entry !== null);
}

export async function readFavorites(): Promise<FavoritesState> {
  const parsed = await storage.readJson<{
    places?: unknown;
    guides?: unknown;
  }>(KEYS.favorites, EMPTY_FAVORITES);

  return {
    places: normalize(parsed.places),
    guides: normalize(parsed.guides),
  };
}

async function writeFavorites(state: FavoritesState): Promise<FavoritesState> {
  await storage.writeJson(KEYS.favorites, state);
  return state;
}

export async function toggleFavorite(
  id: string,
  target: FavoriteTarget,
  snapshot: Partial<FavoriteSnapshot> = {},
): Promise<FavoriteToggleResult> {
  const state = await readFavorites();
  const current = bucket(state, target);

  const existing = current.find((item) => item.id === id);
  const next = existing
    ? current.filter((item) => item.id !== id)
    : [...current, { id, savedAt: new Date().toISOString(), ...snapshot }];

  const updated: FavoritesState = {
    ...state,
    [target === "place" ? "places" : "guides"]: next,
  };

  return { state: await writeFavorites(updated), added: !existing };
}

export async function isFavorite(
  id: string,
  target: FavoriteTarget = "place",
): Promise<boolean> {
  const state = await readFavorites();
  return bucket(state, target).some((item) => item.id === id);
}

export async function removeFavorite(
  id: string,
  target: FavoriteTarget,
): Promise<FavoritesState> {
  const state = await readFavorites();
  return writeFavorites({
    ...state,
    [target === "place" ? "places" : "guides"]: bucket(state, target).filter(
      (item) => item.id !== id,
    ),
  });
}

export async function clearFavorites(): Promise<FavoritesState> {
  return writeFavorites(EMPTY_FAVORITES);
}


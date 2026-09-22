import type {
  FavoriteSnapshot,
  FavoritesState,
  FavoriteTarget,
  FavoriteToggleResult,
} from "@/features/favorites/types";

const STORAGE_KEY = "kt-favorites";

/**
 * Favorites data service.
 *
 * The backend models `user_fav_place` but does not expose public favorite
 * endpoints yet, so favorites are persisted locally (with a small snapshot
 * of each saved item so the "Saved" screen can render offline). This module
 * is the single seam where a server-backed implementation can be plugged in
 * without touching UI code — every viewer must go through these functions.
 */
export function readFavorites(): FavoritesState {
  if (typeof window === "undefined") {
    return { places: [], guides: [] };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { places: [], guides: [] };
    const parsed = JSON.parse(raw) as {
      places: FavoriteSnapshot[] | string[];
      guides: FavoriteSnapshot[] | string[];
    };
    return {
      places: normalize(parsed.places),
      guides: normalize(parsed.guides),
    };
  } catch {
    return { places: [], guides: [] };
  }
}

function writeFavorites(state: FavoritesState): FavoritesState {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable — keep in-memory result
  }
  return state;
}

/** Accepts the legacy shape (plain id strings) and upgrades it in place. */
function normalize(list: unknown): FavoriteSnapshot[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter(Boolean)
    .map((entry): FavoriteSnapshot => {
      if (typeof entry === "string") {
        return { id: entry, name: undefined };
      }
      return {
        id: String(entry.id ?? ""),
        name: entry.name,
        image: entry.image,
        districtSlug: entry.districtSlug,
        savedAt: entry.savedAt,
      };
    })
    .filter((e) => e.id.length > 0);
}

function toggleId(
  list: FavoriteSnapshot[],
  id: string,
  snapshot: Partial<FavoriteSnapshot>
): { next: FavoriteSnapshot[]; added: boolean } {
  const existing = list.find((x) => x.id === id);
  if (existing) {
    return { next: list.filter((x) => x.id !== id), added: false };
  }
  return {
    next: [...list, { id, savedAt: new Date().toISOString(), ...snapshot }],
    added: true,
  };
}

export function toggleFavorite(
  id: string,
  type: FavoriteTarget,
  snapshot: Partial<FavoriteSnapshot> = {}
): FavoriteToggleResult {
  const state = readFavorites();
  const key: keyof FavoritesState = type === "place" ? "places" : "guides";
  const { next, added } = toggleId(state[key], id, snapshot);
  return {
    state: writeFavorites({ ...state, [key]: next }),
    added,
  };
}

export function isFavorite(id: string, type: FavoriteTarget = "place"): boolean {
  const state = readFavorites();
  return (state[type === "place" ? "places" : "guides"] ?? []).some((x) => x.id === id);
}

export function snapshots(): FavoritesState {
  return readFavorites();
}

export function removeFavorite(id: string, type: FavoriteTarget): FavoritesState {
  const state = readFavorites();
  const key: keyof FavoritesState = type === "place" ? "places" : "guides";
  return writeFavorites({ ...state, [key]: state[key].filter((x) => x.id !== id) });
}

export function clearFavorites(): FavoritesState {
  return writeFavorites({ places: [], guides: [] });
}
/**
 * Saved items hook.
 *
 * Owns the in-memory favourites state so every screen sees the same list
 * immediately after a toggle, rather than each one re-reading storage and
 * rendering a stale heart until its next focus. Storage stays the source of truth
 * — this is a cache in front of it, seeded on mount and written through on every
 * change.
 */

import { useCallback, useEffect, useState } from "react";
import {
  clearFavorites,
  isFavorite,
  readFavorites,
  removeFavorite,
  toggleFavorite,
  type FavoriteSnapshot,
  type FavoriteTarget,
  type FavoritesState,
} from "@/services/favorites.service";
import { EMPTY_FAVORITES } from "@/services/favorites.service";

type Value = FavoritesState & {
  ready: boolean;
  isSaved: (id: string, target?: FavoriteTarget) => boolean;
  toggle: (
    id: string,
    target: FavoriteTarget,
    snapshot?: Partial<FavoriteSnapshot>,
  ) => Promise<boolean>;
  remove: (id: string, target: FavoriteTarget) => Promise<void>;
  clear: () => Promise<void>;
  total: number;
};

export function useFavorites(): Value {
  const [state, setState] = useState<FavoritesState>(EMPTY_FAVORITES);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const stored = await readFavorites();
      if (cancelled) return;
      setState(stored);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const isSaved = useCallback(
    (id: string, target: FavoriteTarget = "place") =>
      (target === "place" ? state.places : state.guides).some((item) => item.id === id),
    [state],
  );

  const toggle = useCallback(
    async (
      id: string,
      target: FavoriteTarget,
      snapshot?: Partial<FavoriteSnapshot>,
    ): Promise<boolean> => {
      const result = await toggleFavorite(id, target, snapshot);
      setState(result.state);
      return result.added;
    },
    [],
  );

  const remove = useCallback(async (id: string, target: FavoriteTarget) => {
    setState(await removeFavorite(id, target));
  }, []);

  const clear = useCallback(async () => {
    setState(await clearFavorites());
  }, []);

  return {
    ...state,
    ready,
    isSaved,
    toggle,
    remove,
    clear,
    total: state.places.length + state.guides.length,
  };
}

/** Single-item variant for a heart button on one card. */
export function useIsFavorite(id: string, target: FavoriteTarget = "place"): boolean {
  const favorites = useFavorites();
  return favorites.ready && favorites.isSaved(id, target);
}

export { isFavorite };
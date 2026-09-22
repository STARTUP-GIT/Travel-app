"use client";

import { toast } from "sonner";
import * as React from "react";

import * as favoritesApi from "@/features/favorites/api/favorites.api";
import type {
  FavoriteSnapshot,
  FavoriteTarget,
  FavoritesState,
} from "@/features/favorites/types";

type FavoriteContextValue = {
  saved: FavoriteSnapshot[];
  isSaved: (id: string, type?: FavoriteTarget) => boolean;
  toggle: (
    id: string,
    type?: FavoriteTarget,
    snapshot?: Partial<FavoriteSnapshot>
  ) => void;
  snapshots: FavoritesState;
};

const FavoriteContext = React.createContext<FavoriteContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [snapshots, setSnapshots] = React.useState<FavoritesState>({
    places: [],
    guides: [],
  });

  React.useEffect(() => {
    setSnapshots(favoritesApi.readFavorites());
  }, []);

  const saved = React.useMemo(
    () => [...snapshots.places, ...snapshots.guides],
    [snapshots]
  );

  const isSaved = React.useCallback((id: string, type: FavoriteTarget = "place") => {
    return favoritesApi.isFavorite(id, type);
  }, []);

  const toggle = React.useCallback(
    (id: string, type: FavoriteTarget = "place", snapshot: Partial<FavoriteSnapshot> = {}) => {
      const { added } = favoritesApi.toggleFavorite(id, type, snapshot);
      setSnapshots(favoritesApi.readFavorites());
      toast[added ? "success" : "info"](
        added ? "Saved to favorites" : "Removed from favorites",
        {
          description: added
            ? "You can find it under Saved."
            : "It was removed from your Saved list.",
        }
      );
    },
    []
  );

  return (
    <FavoriteContext.Provider value={{ saved, isSaved, toggle, snapshots }}>
      {children}
    </FavoriteContext.Provider>
  );
}

export function useFavorites(): FavoriteContextValue {
  const ctx = React.useContext(FavoriteContext);
  if (!ctx) {
    throw new Error("useFavorites must be used within FavoritesProvider");
  }
  return ctx;
}
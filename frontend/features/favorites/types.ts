export type FavoriteTarget = "place" | "guide";

export type FavoriteSnapshot = {
  id: string;
  name?: string;
  image?: string | null;
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
/**
 * Device-local persistence.
 *
 * Two kinds of data live here, for two different reasons:
 *
 *  1. The session token — see `token-store.ts`, which uses the OS keystore.
 *  2. Saved items and submitted reviews.
 *
 * On (2): the backend's Prisma schema models `user_fav_place`, but it exposes no
 * public endpoint for reading or writing favourites, and the review text fields
 * on the listings are read-only legacy columns with no create endpoint. The
 * customer web frontend therefore persists both locally and treats those modules
 * as the single seam where a server-backed implementation can be dropped in.
 *
 * This module keeps that behaviour rather than inventing a mobile-only API the
 * user explicitly ruled out. Every viewer goes through the `favorites` and
 * `reviews` service modules, so swapping in a server later touches one file.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  favorites: "kt-favorites",
  reviews: "kt-reviews",
  lastDistrict: "kt-last-district",
  recentSearches: "kt-recent-searches",
  transportPlans: "kt-transport-plans",
  reports: "kt-reports",
  trips: "kt-path-tracker-history",
  trackerState: "kt-path-tracker",
} as const;

export type StorageKey = (typeof KEYS)[keyof typeof KEYS];

async function readJson<T>(key: StorageKey, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    // Corrupt or unreadable storage behaves exactly like "nothing saved yet".
    return fallback;
  }
}

async function writeJson(key: StorageKey, value: unknown): Promise<boolean> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const storage = {
  readJson,
  writeJson,

  async readString(key: StorageKey): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },

  async writeString(key: StorageKey, value: string): Promise<boolean> {
    try {
      await AsyncStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },

  async remove(key: StorageKey): Promise<void> {
    await AsyncStorage.removeItem(key).catch(() => {});
  },
};

export { KEYS };
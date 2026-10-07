/**
 * Session token storage.
 *
 * The backend issues a JWT for the customer (`generateSessionToken(id, "user")`)
 * and accepts it either as the httpOnly `token` cookie or as an
 * `Authorization: Bearer` header. A native app has no cookie jar and must send
 * the header, so the token has to live on the device — which makes *where* it
 * lives the security decision that matters here.
 *
 * `expo-secure-store` (Keychain on iOS, EncryptedSharedPreferences on Android)
 * is used rather than AsyncStorage. AsyncStorage is world-readable on a rooted
 * or backed-up device; the secure store is backed by the OS keystore and is
 * excluded from Android's auto-backup.
 */

import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "kt-session-token";

/**
 * SecureStore values are capped at 2048 bytes on Android. A JWT with a long
 * `iat`/`exp`/`jti` can approach that, so an oversized token falls back to
 * AsyncStorage rather than failing the sign-in outright. The token is only ever
 * an opaque session credential, and the fallback is documented here rather than
 * being silent.
 */
const SECURE_STORE_LIMIT_BYTES = 2048;

let cachedToken: string | null | undefined;

async function isSecureStoreAvailable(): Promise<boolean> {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function saveToken(token: string): Promise<void> {
  cachedToken = token;

  const fits = token.length <= SECURE_STORE_LIMIT_BYTES;
  if (fits && (await isSecureStoreAvailable())) {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      // Remove any previous AsyncStorage copy so the two never diverge.
      await AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
      return;
    } catch {
      // Fall through to AsyncStorage below.
    }
  }

  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function readToken(): Promise<string | null> {
  if (cachedToken !== undefined) return cachedToken;

  if (await isSecureStoreAvailable()) {
    try {
      const stored = await SecureStore.getItemAsync(TOKEN_KEY);
      if (stored) {
        cachedToken = stored;
        return stored;
      }
    } catch {
      // Fall through.
    }
  }

  try {
    const stored = await AsyncStorage.getItem(TOKEN_KEY);
    cachedToken = stored ?? null;
    return cachedToken;
  } catch {
    cachedToken = null;
    return null;
  }
}

export async function clearToken(): Promise<void> {
  cachedToken = null;

  if (await isSecureStoreAvailable()) {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
  }
  await AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
}

/**
 * Synchronous read for the API client's request interceptor.
 *
 * The auth provider primes the cache on mount and immediately after every
 * sign-in/sign-out, so by the time any request is made this returns the current
 * token without awaiting I/O inside the request path.
 */
export function getCachedToken(): string | null {
  return cachedToken ?? null;
}
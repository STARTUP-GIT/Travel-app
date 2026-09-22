type CacheEntry = { data: unknown; expires: number };

const TTL_MS = 60_000;

const store = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

/**
 * Thin in-memory cache with a short TTL and in-flight de-duplication. It is
 * shared by every caller of the same key (server and client) so repeated
 * requests for the same public listing (hotels, restaurants, districts,
 * settings) collapse into one backend call per window instead of firing the
 * same heavy request on every page. Errors are never cached and in-flight
 * failures are removed so a temporary outage is not masked.
 */
export async function memoizedGet<T>(
  key: string,
  loader: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expires > now) {
    return hit.data as T;
  }

  const running = inflight.get(key) as Promise<T> | undefined;
  if (running) {
    return running;
  }

  const job = loader()
    .then((data) => {
      store.set(key, { data, expires: now + TTL_MS });
      inflight.delete(key);
      return data;
    })
    .catch((error) => {
      inflight.delete(key);
      throw error;
    });

  inflight.set(key, job);
  return job;
}

/** Clears one cached key, or the whole cache when no key is given. */
export function clearMemoizedGet(key?: string) {
  if (key) {
    store.delete(key);
  } else {
    store.clear();
  }
}
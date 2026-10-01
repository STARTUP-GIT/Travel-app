type CacheEntry = { data: unknown; expires: number };

// Provider/public listing content is refreshed by admin actions, so a shorter
// cache window keeps district and place data aligned with current approval
// state without a full redeploy.
const TTL_MS = 15_000;

const store = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

/**
 * Thin in-memory cache with a short TTL and in-flight de-duplication. Shared by
 * every caller of the same key so repeated requests for the same public
 * listing (districts, places, settings) collapse into one backend call per
 * window instead of firing the same heavy request on every page. Errors are
 * never cached and in-flight failures are removed so a temporary outage is not
 * masked.
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

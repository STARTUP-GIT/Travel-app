/**
 * Data-fetching hook.
 *
 * Deliberately not a caching library: this app's data is small, always fresh on
 * open (a place's price or a booking's status changes), and read from one
 * backend, so a request-per-screen-load is both simpler and more correct than
 * stale-while-revalidate caching.
 *
 * Handles the cases that cause real bugs in a hand-rolled hook:
 *   - a response arriving after the screen unmounts
 *   - `refetch` being called while a request is already in flight
 *   - an error that must not overwrite newer successful data on a refresh
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { toUserMessage } from "@/lib/api/client";

export type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** True during a background refresh, while previous data is still shown. */
  refreshing: boolean;
  reload: () => void;
  /** Replaces the data locally, e.g. after a mutation. */
  setData: React.Dispatch<React.SetStateAction<T | null>>;
};

export function useAsync<T>(
  loader: () => Promise<T>,
  deps: React.DependencyList,
  options: { enabled?: boolean } = {},
): AsyncState<T> {
  const enabled = options.enabled ?? true;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mounted = useRef(true);
  const inFlight = useRef(false);
  // Guards against a slow first request landing after a newer one.
  const requestId = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(
    async (isRefresh: boolean) => {
      if (!enabled || inFlight.current) return;

      inFlight.current = true;
      const id = ++requestId.current;

      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const result = await loader();
        if (!mounted.current || id !== requestId.current) return;
        setData(result);
        setError(null);
      } catch (cause) {
        if (!mounted.current || id !== requestId.current) return;
        // A failed refresh keeps whatever is already on screen and reports the
        // problem alongside it, instead of blanking a working list.
        setError(toUserMessage(cause));
      } finally {
        if (mounted.current && id === requestId.current) {
          inFlight.current = false;
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    // `loader` is intentionally omitted: callers pass a fresh closure and list
    // their real inputs in `deps`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, ...deps],
  );

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    void run(false);
  }, [enabled, run]);

  const reload = useCallback(() => {
    void run(true);
  }, [run]);

  return { data, loading, error, refreshing, reload, setData };
}
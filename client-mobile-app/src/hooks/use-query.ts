/**
 * Screen-shaped helpers over `useAsync`.
 *
 * `useQuery` exists so the common case reads as one line at the call site, and
 * `useDebounced` so a search input does not fire a request per keystroke. Both
 * are thin on purpose — the request lifecycle lives in `useAsync`.
 */

import { useEffect, useState } from "react";
import { useAsync, type AsyncState } from "@/hooks/use-async";

export function useQuery<T>(
  loader: () => Promise<T>,
  deps: React.DependencyList,
  options?: { enabled?: boolean },
): AsyncState<T> {
  return useAsync<T>(loader, deps, options);
}

/** Debounces a rapidly-changing value, for search inputs. */
export function useDebounced<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}
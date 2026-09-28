"use client";

import * as React from "react";

type AsyncState<T> = {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  refetch: () => void;
};

/**
 * Runs an async loader and keeps the latest result.
 *
 * The loader identity is deliberately not tracked: callers pass an inline
 * function, so it changes on every render. The loader is therefore read through
 * a stable wrapper, and only `deps` or `refetch` start a new load.
 */
export function useAsync<T>(
  loader: () => Promise<T>,
  deps: React.DependencyList = []
): AsyncState<T> {
  const [data, setData] = React.useState<T | undefined>(undefined);
  const [error, setError] = React.useState<Error | undefined>(undefined);
  const [isLoading, setIsLoading] = React.useState(true);
  const [tick, setTick] = React.useState(0);

  const load = useAsyncLoader(loader);
  // A serialised key keeps the dependency list honest without spreading a
  // variable-length array into the effect, which the lint rules reject.
  const depsKey = JSON.stringify(deps);

  React.useEffect(() => {
    let cancelled = false;

    load()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError(undefined);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error("Unexpected error occurred"));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [load, depsKey, tick]);

  const refetch = React.useCallback(() => {
    setIsLoading(true);
    setTick((current) => current + 1);
  }, []);

  return { data, error, isLoading, refetch };
}

/**
 * Stable wrapper around the latest loader. Kept in its own hook so the ref write
 * happens in an effect, never during render.
 */
function useAsyncLoader<T>(loader: () => Promise<T>): () => Promise<T> {
  const loaderRef = React.useRef(loader);

  React.useEffect(() => {
    loaderRef.current = loader;
  });

  return React.useCallback(() => loaderRef.current(), []);
}

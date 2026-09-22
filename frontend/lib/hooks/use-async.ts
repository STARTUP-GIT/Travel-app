"use client";

import * as React from "react";

type AsyncState<T> = {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  refetch: () => void;
};

export function useAsync<T>(
  loader: () => Promise<T>,
  deps: React.DependencyList = []
): AsyncState<T> {
  const [data, setData] = React.useState<T | undefined>(undefined);
  const [error, setError] = React.useState<Error | undefined>(undefined);
  const [isLoading, setIsLoading] = React.useState(true);
  const [tick, setTick] = React.useState(0);

  const loaderRef = React.useRef(loader);
  loaderRef.current = loader;

  React.useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setError(undefined);

    loaderRef
      .current()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err : new Error("Unexpected error occurred")
          );
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const refetch = React.useCallback(() => setTick((t) => t + 1), []);

  return { data, error, isLoading, refetch };
}
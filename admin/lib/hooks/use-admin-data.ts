"use client";

import * as React from "react";

export type DataState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

type Options = {
  query?: Record<string, string | number | boolean | undefined>;
  enabled?: boolean;
};

/** Minimal data-fetching hook that goes through /api/proxy with the token cookie. */
export function useAdminData<T>(path: string, opts: Options = {}): DataState<T> {
  const { query, enabled = true } = opts;
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [nonce, setNonce] = React.useState(0);

  React.useEffect(() => {
    let active = true;
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const qs = query
          ? new URLSearchParams(
              Object.entries(query)
                .filter(([, v]) => v !== undefined)
                .map(([k, v]) => [k, String(v)])
            ).toString()
          : "";
        const res = await fetch(`/api/proxy${path}${qs ? `?${qs}` : ""}`, {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (res.status === 401 && typeof window !== "undefined") {
          window.location.assign("/login");
          return;
        }
        if (!res.ok) {
          let message = `Request failed (${res.status})`;
          try {
            const data = (await res.json()) as { message?: string };
            if (data?.message) message = data.message;
          } catch {
            // ignore
          }
          throw new Error(message);
        }
        if (active) {
          setData((await res.json()) as T);
          setError(null);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [path, nonce, enabled, JSON.stringify(query ?? {})]);

  return {
    data,
    loading,
    error,
    refetch: React.useCallback(() => setNonce((n) => n + 1), []),
  };
}
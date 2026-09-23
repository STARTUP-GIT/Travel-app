"use client";

import * as React from "react";

import { getApiBaseUrl } from "@/lib/api/config";
import {
  clearCachedAdminToken,
  toBackendPath,
  withAuthHeaders,
} from "@/lib/api/client";

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

/**
 * Minimal data-fetching hook that reads authenticated admin data DIRECTLY from
 * the Express backend. Pages address admin data as /admin/api/*, but the backend
 * mounts these endpoints at /api/admin/* (backend app.ts:
 * app.use('/api/admin', ...)), so toBackendPath normalises the prefix. The
 * admin bearer token from the NextAuth session is attached as an
 * Authorization header.
 */
export function useAdminData<T>(path: string, opts: Options = {}): DataState<T> {
  const { query, enabled = true } = opts;
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(enabled);
  const [error, setError] = React.useState<string | null>(null);
  const [nonce, setNonce] = React.useState(0);

  React.useEffect(() => {
    let active = true;
    if (!enabled) {
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const qs = query
          ? new URLSearchParams(
              Object.entries(query)
                .filter(([, v]) => v !== undefined)
                .map(([k, v]) => [k, String(v)])
            ).toString()
          : "";
        const headers = await withAuthHeaders();
        const res = await fetch(
          `${getApiBaseUrl()}${toBackendPath(path)}${qs ? `?${qs}` : ""}`,
          {
            headers,
            credentials: "include",
            cache: "no-store",
          }
        );
        if (res.status === 401 && typeof window !== "undefined") {
          clearCachedAdminToken();
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
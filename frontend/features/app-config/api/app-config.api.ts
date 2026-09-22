import { api } from "@/lib/api/client";
import { memoizedGet } from "@/lib/api/cache";
import type { AppConfig } from "../types";
import { FALLBACK_CONFIG } from "../types";

type AppConfigResponse = typeof FALLBACK_CONFIG;

/**
 * Fetches the admin-controlled application configuration (public endpoint).
 * Falls back to a neutral in-app fallback on failure so the customer app
 * never breaks when the configuration API is unreachable. Cached with a short
 * TTL so the metadata, layout and provider mounts share one settings request.
 */
export async function getAppConfig(): Promise<AppConfig> {
  return memoizedGet("app-config", async () => {
    try {
      return await api.get<AppConfigResponse>("/api/settings");
    } catch {
      return { ...(FALLBACK_CONFIG as AppConfig) };
    }
  });
}
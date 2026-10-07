import { api } from "@/lib/api/client";
import { memoizedGet } from "@/lib/api/cache";
import type { AppConfig } from "../types";
import { FALLBACK_CONFIG } from "../types";

/**
 * Fetches the admin-controlled application configuration (public endpoint).
 * Falls back to a neutral in-app fallback on failure so the service app never
 * breaks when the configuration API is unreachable. Cached with a short TTL so
 * the metadata, layout and provider mounts share one settings request.
 */
export async function getAppConfig(): Promise<AppConfig> {
  return memoizedGet("app-config", async () => {
    try {
      return await api.get<AppConfig>("/api/service-settings");
    } catch {
      return { ...(FALLBACK_CONFIG as AppConfig) };
    }
  });
}

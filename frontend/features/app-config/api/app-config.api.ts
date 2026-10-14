import { api } from "@/lib/api/client";
import { memoizedGet } from "@/lib/api/cache";
import type { AppConfig, BrandConfig } from "../types";
import { FALLBACK_CONFIG } from "../types";

/**
 * Fetches the centrally managed ATLASWANDERS brand configuration.
 * Reads published branding from backend /api/branding or /api/settings.
 * Gracefully falls back to official in-app defaults on network failure.
 * Memoized with TTL to avoid redundant requests during server rendering and hydration.
 */
export async function getAppConfig(): Promise<AppConfig> {
  return memoizedGet("app-config", async () => {
    try {
      // 1. Dedicated public branding endpoint
      const brand = await api.get<BrandConfig>("/api/branding").catch(() => null);
      if (brand && brand.brandName) {
        return {
          ...FALLBACK_CONFIG,
          ...brand,
          app_name: brand.brandName,
          webTitle: brand.defaultTitle,
          icon: brand.faviconUrl || brand.symbolLogoUrl,
          app_description: brand.brandDescription || FALLBACK_CONFIG.app_description,
        };
      }

      // 2. Settings endpoint fallback
      const settings = await api.get<Partial<AppConfig>>("/api/settings");
      return {
        ...FALLBACK_CONFIG,
        ...settings,
        app_name: settings.brandName || settings.app_name || FALLBACK_CONFIG.app_name,
        webTitle: settings.defaultTitle || settings.webTitle || FALLBACK_CONFIG.webTitle,
        icon: settings.faviconUrl || settings.icon || FALLBACK_CONFIG.icon,
      };
    } catch {
      return { ...(FALLBACK_CONFIG as AppConfig) };
    }
  });
}
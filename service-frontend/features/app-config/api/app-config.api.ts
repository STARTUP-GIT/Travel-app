import { api } from "@/lib/api/client";
import type { AppConfig, BrandConfig } from "../types";
import { FALLBACK_CONFIG } from "../types";

/**
 * Fetches the centrally managed ATLASWANDERS brand configuration.
 * Reads published branding from backend /api/branding or /api/service-settings.
 * Gracefully falls back to official in-app defaults on network failure.
 * Always fetches fresh to immediately reflect admin changes without stale caching.
 */
export async function getAppConfig(): Promise<AppConfig> {
  try {
    // 1. Primary: Published Service App settings (app name, web title, tagline, banners, icon, description, legal)
    const settings = await api.get<Partial<AppConfig>>("/api/service-settings").catch(() => null);
    if (settings && (settings.app_name || settings.brandName)) {
      const canonicalName = (settings.app_name || settings.brandName || FALLBACK_CONFIG.brandName).trim();
      const canonicalTagline = (settings.tagline || settings.text || "Partner & Service Provider Portal").trim();
      return {
        ...FALLBACK_CONFIG,
        ...settings,
        appName: canonicalName,
        app_name: canonicalName,
        brandName: canonicalName,
        tagline: canonicalTagline,
        text: canonicalTagline,
        webTitle: settings.webTitle || `${canonicalName} | Provider Portal`,
        icon: settings.icon || settings.faviconUrl || settings.symbolLogoUrl || FALLBACK_CONFIG.icon,
        symbolLogoUrl: settings.symbolLogoUrl || settings.icon || FALLBACK_CONFIG.symbolLogoUrl,
        primaryLogoUrl: settings.primaryLogoUrl || settings.icon || FALLBACK_CONFIG.primaryLogoUrl,
        faviconUrl: settings.faviconUrl || settings.icon || FALLBACK_CONFIG.faviconUrl,
        imageBanners: Array.isArray(settings.imageBanners) ? settings.imageBanners : [],
        app_description: settings.app_description || FALLBACK_CONFIG.app_description,
      };
    }

    // 2. Secondary: Global published brand config
    const brand = await api.get<BrandConfig>("/api/branding").catch(() => null);
    if (brand && brand.brandName) {
      return {
        ...FALLBACK_CONFIG,
        ...brand,
        app_name: brand.brandName,
        webTitle: `${brand.brandName} | Provider Portal`,
        icon: brand.faviconUrl || brand.symbolLogoUrl,
        app_description: brand.brandDescription || FALLBACK_CONFIG.app_description,
      };
    }

    return { ...(FALLBACK_CONFIG as AppConfig) };
  } catch {
    return { ...(FALLBACK_CONFIG as AppConfig) };
  }
}

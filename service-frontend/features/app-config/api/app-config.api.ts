import { api } from "@/lib/api/client";
import type { AppConfig, BrandConfig } from "../types";
import { FALLBACK_CONFIG } from "../types";

/**
 * Fetches the authoritative ATLASWANDERS brand configuration from the backend.
 * Reads published branding from backend /api/service-settings or /api/branding.
 *
 * Returns null on failure so existing active branding is preserved without
 * being silently overwritten by hardcoded defaults.
 */
export async function getAppConfig(): Promise<AppConfig | null> {
  try {
    // 1. Primary: Published Service App settings from /api/service-settings
    const settings = await api.get<Partial<AppConfig>>("/api/service-settings").catch(() => null);
    if (settings && (settings.app_name || settings.brandName)) {
      const canonicalName = (settings.app_name || settings.brandName || FALLBACK_CONFIG.brandName).trim();
      const canonicalTagline = (settings.tagline || settings.text || FALLBACK_CONFIG.tagline).trim();
      return {
        ...FALLBACK_CONFIG,
        ...settings,
        appName: canonicalName,
        app_name: canonicalName,
        brandName: canonicalName,
        tagline: canonicalTagline,
        text: canonicalTagline,
        webTitle: settings.webTitle || `${canonicalName} | Partner & Service Provider Portal`,
        icon: settings.icon || settings.faviconUrl || settings.symbolLogoUrl || FALLBACK_CONFIG.icon,
        symbolLogoUrl: settings.symbolLogoUrl || settings.icon || FALLBACK_CONFIG.symbolLogoUrl,
        primaryLogoUrl: settings.primaryLogoUrl || settings.icon || FALLBACK_CONFIG.primaryLogoUrl,
        faviconUrl: settings.faviconUrl || settings.icon || FALLBACK_CONFIG.faviconUrl,
        imageBanners: Array.isArray(settings.imageBanners) ? settings.imageBanners : [],
        app_description: settings.app_description || FALLBACK_CONFIG.app_description,
      };
    }

    // 2. Secondary: Global published brand config from /api/branding
    const brand = await api.get<BrandConfig>("/api/branding").catch(() => null);
    if (brand && brand.brandName) {
      return {
        ...FALLBACK_CONFIG,
        ...brand,
        app_name: brand.brandName,
        appName: brand.brandName,
        brandName: brand.brandName,
        webTitle: brand.defaultTitle || `${brand.brandName} | Partner & Service Provider Portal`,
        icon: brand.faviconUrl || brand.symbolLogoUrl || FALLBACK_CONFIG.icon,
        app_description: brand.brandDescription || FALLBACK_CONFIG.app_description,
      };
    }

    return null;
  } catch (error) {
    console.error("[getAppConfig] Error fetching branding:", error);
    return null;
  }
}

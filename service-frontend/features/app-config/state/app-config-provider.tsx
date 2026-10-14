"use client";

import * as React from "react";

import { FALLBACK_CONFIG, type AppConfig } from "../types";
import { getAppConfig } from "../api/app-config.api";

type BrandingContextValue = {
  config: AppConfig | null;
  isLoading: boolean;
  appName: string;
  brandName: string;
  tagline: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  primaryLogoUrl: string;
  symbolLogoUrl: string;
  lightLogoUrl: string;
  darkLogoUrl: string;
  faviconUrl: string;
  refetch: () => Promise<void>;
};

const BrandingContext = React.createContext<BrandingContextValue>({
  config: null,
  isLoading: true,
  appName: "",
  brandName: "",
  tagline: "",
  primaryColor: "#0B2545",
  secondaryColor: "#087E8B",
  accentColor: "#D9A441",
  primaryLogoUrl: "/brand/atlaswanders-primary.svg",
  symbolLogoUrl: "/brand/atlaswanders-symbol.svg",
  lightLogoUrl: "/brand/atlaswanders-light.svg",
  darkLogoUrl: "/brand/atlaswanders-dark.svg",
  faviconUrl: "/brand/atlaswanders-favicon.svg",
  refetch: async () => {},
});

function isValidBranding(c: Partial<AppConfig> | null | undefined): c is AppConfig {
  if (!c) return false;
  const name = c.app_name?.trim() || c.appName?.trim() || c.brandName?.trim();
  return Boolean(name && name.length > 0);
}

/**
 * Single source of truth for admin-controlled ATLASWANDERS branding inside
 * service-provider components (logo, header, top bar, auth screens, footer).
 *
 * Guarantees:
 * 1. Admin configuration is authoritative — no hardcoded overrides.
 * 2. Uses server-passed `initialConfig` directly to prevent any initial flicker.
 * 3. Never replaces valid existing branding with empty or failed responses.
 * 4. Provides reserved layout state when initially loading without cached data.
 * 5. Synchronizes CSS custom properties to maintain brand alignment.
 */
export function AppConfigProvider({
  initialConfig,
  children,
}: {
  initialConfig?: AppConfig | null;
  children: React.ReactNode;
}) {
  const [config, setConfig] = React.useState<AppConfig | null>(() => {
    return isValidBranding(initialConfig) ? (initialConfig as AppConfig) : null;
  });

  const [isLoading, setIsLoading] = React.useState<boolean>(() => {
    return !isValidBranding(initialConfig);
  });

  const syncConfig = React.useCallback(async () => {
    try {
      const next = await getAppConfig();
      if (isValidBranding(next)) {
        const validNext = next;
        setConfig((prev) => {
          if (!prev) return validNext;
          const isIdentical =
            prev.app_name === validNext.app_name &&
            prev.appName === validNext.appName &&
            prev.tagline === validNext.tagline &&
            prev.text === validNext.text &&
            prev.icon === validNext.icon &&
            prev.primaryLogoUrl === validNext.primaryLogoUrl &&
            prev.symbolLogoUrl === validNext.symbolLogoUrl &&
            prev.primaryColor === validNext.primaryColor &&
            prev.secondaryColor === validNext.secondaryColor &&
            prev.accentColor === validNext.accentColor;
          return isIdentical ? prev : validNext;
        });
      }
    } catch (err) {
      console.warn("[AppConfigProvider] Client revalidation failed; keeping active branding:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    syncConfig().catch(() => {});
    return () => {
      active = false;
    };
  }, [syncConfig]);

  // Sync brand CSS variables when colors change
  React.useEffect(() => {
    if (typeof document !== "undefined" && config) {
      const root = document.documentElement;
      if (config.primaryColor) root.style.setProperty("--brand-primary", config.primaryColor);
      if (config.secondaryColor) root.style.setProperty("--brand-secondary", config.secondaryColor);
      if (config.accentColor) root.style.setProperty("--brand-accent", config.accentColor);
    }
  }, [config?.primaryColor, config?.secondaryColor, config?.accentColor]);

  const value = React.useMemo<BrandingContextValue>(() => {
    const active = config ?? (isLoading ? null : FALLBACK_CONFIG);
    const canonicalName = (
      active?.app_name ||
      active?.appName ||
      active?.brandName ||
      (isLoading ? "" : FALLBACK_CONFIG.brandName)
    ).trim();

    const canonicalTagline = (
      active?.tagline ||
      active?.text ||
      (isLoading ? "" : FALLBACK_CONFIG.tagline)
    ).trim();

    return {
      config,
      isLoading,
      appName: canonicalName,
      brandName: canonicalName,
      tagline: canonicalTagline,
      primaryColor: active?.primaryColor || FALLBACK_CONFIG.primaryColor,
      secondaryColor: active?.secondaryColor || FALLBACK_CONFIG.secondaryColor,
      accentColor: active?.accentColor || FALLBACK_CONFIG.accentColor,
      primaryLogoUrl: active?.icon || active?.primaryLogoUrl || FALLBACK_CONFIG.primaryLogoUrl,
      symbolLogoUrl: active?.icon || active?.symbolLogoUrl || FALLBACK_CONFIG.symbolLogoUrl,
      lightLogoUrl: active?.lightLogoUrl || FALLBACK_CONFIG.lightLogoUrl,
      darkLogoUrl: active?.darkLogoUrl || FALLBACK_CONFIG.darkLogoUrl,
      faviconUrl: active?.icon || active?.faviconUrl || FALLBACK_CONFIG.faviconUrl,
      refetch: syncConfig,
    };
  }, [config, isLoading, syncConfig]);

  return (
    <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
  );
}

export function useBranding() {
  return React.useContext(BrandingContext);
}

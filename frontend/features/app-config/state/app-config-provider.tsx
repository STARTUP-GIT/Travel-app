"use client";

import * as React from "react";

import { FALLBACK_CONFIG, type AppConfig } from "../types";
import { getAppConfig } from "../api/app-config.api";

type BrandingContextValue = {
  config: AppConfig;
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
  bannerImages: string[];
};

const BrandingContext = React.createContext<BrandingContextValue>({
  config: FALLBACK_CONFIG,
  appName: FALLBACK_CONFIG.brandName,
  brandName: FALLBACK_CONFIG.brandName,
  tagline: FALLBACK_CONFIG.tagline,
  primaryColor: FALLBACK_CONFIG.primaryColor,
  secondaryColor: FALLBACK_CONFIG.secondaryColor,
  accentColor: FALLBACK_CONFIG.accentColor,
  primaryLogoUrl: FALLBACK_CONFIG.primaryLogoUrl,
  symbolLogoUrl: FALLBACK_CONFIG.symbolLogoUrl,
  lightLogoUrl: FALLBACK_CONFIG.lightLogoUrl,
  darkLogoUrl: FALLBACK_CONFIG.darkLogoUrl,
  faviconUrl: FALLBACK_CONFIG.faviconUrl,
  bannerImages: [],
});

/**
 * Single source of truth for admin-controlled ATLASWANDERS branding.
 * Accepts server-fetched config to prevent flash-of-unstyled/wrong logo,
 * then revalidates in the background. Synchronizes CSS custom properties.
 */
export function AppConfigProvider({
  initialConfig,
  children,
}: {
  initialConfig?: AppConfig | null;
  children: React.ReactNode;
}) {
  const [config, setConfig] = React.useState<AppConfig>(
    initialConfig ?? FALLBACK_CONFIG
  );

  React.useEffect(() => {
    let active = true;
    getAppConfig().then((next) => {
      if (active) setConfig(next);
    });
    return () => {
      active = false;
    };
  }, []);

  // Sync brand CSS variables
  React.useEffect(() => {
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      if (config.primaryColor) root.style.setProperty("--brand-primary", config.primaryColor);
      if (config.secondaryColor) root.style.setProperty("--brand-secondary", config.secondaryColor);
      if (config.accentColor) root.style.setProperty("--brand-accent", config.accentColor);
    }
  }, [config.primaryColor, config.secondaryColor, config.accentColor]);

  const value = React.useMemo<BrandingContextValue>(
    () => ({
      config,
      appName: config.brandName || config.app_name || FALLBACK_CONFIG.brandName,
      brandName: config.brandName || config.app_name || FALLBACK_CONFIG.brandName,
      tagline: config.tagline || config.webTitle || FALLBACK_CONFIG.tagline,
      primaryColor: config.primaryColor || FALLBACK_CONFIG.primaryColor,
      secondaryColor: config.secondaryColor || FALLBACK_CONFIG.secondaryColor,
      accentColor: config.accentColor || FALLBACK_CONFIG.accentColor,
      primaryLogoUrl: config.primaryLogoUrl || FALLBACK_CONFIG.primaryLogoUrl,
      symbolLogoUrl: config.symbolLogoUrl || FALLBACK_CONFIG.symbolLogoUrl,
      lightLogoUrl: config.lightLogoUrl || FALLBACK_CONFIG.lightLogoUrl,
      darkLogoUrl: config.darkLogoUrl || FALLBACK_CONFIG.darkLogoUrl,
      faviconUrl: config.faviconUrl || FALLBACK_CONFIG.faviconUrl,
      bannerImages: config.imageBanners ?? [],
    }),
    [config]
  );

  return (
    <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
  );
}

export function useBranding() {
  return React.useContext(BrandingContext);
}
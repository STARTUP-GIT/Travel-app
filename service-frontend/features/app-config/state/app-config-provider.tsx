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
};

const BrandingContext = React.createContext<BrandingContextValue>({
  config: FALLBACK_CONFIG,
  appName: FALLBACK_CONFIG.app_name,
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
});

/**
 * Single source of truth for admin-controlled ATLASWANDERS branding inside
 * service-provider components (logo, header, top bar, auth screens, footer).
 * Accepts server-fetched config to avoid a flash of fallback values.
 * Synchronizes CSS custom properties to maintain brand alignment with customer app.
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

  const value = React.useMemo<BrandingContextValue>(() => {
    const canonicalName = (config.app_name || config.brandName || FALLBACK_CONFIG.brandName).trim();
    const canonicalTagline = (config.tagline || config.text || "Partner & Service Provider Portal").trim();
    return {
      config,
      appName: canonicalName,
      brandName: canonicalName,
      tagline: canonicalTagline,
      primaryColor: config.primaryColor || FALLBACK_CONFIG.primaryColor,
      secondaryColor: config.secondaryColor || FALLBACK_CONFIG.secondaryColor,
      accentColor: config.accentColor || FALLBACK_CONFIG.accentColor,
      primaryLogoUrl: config.icon || config.primaryLogoUrl || FALLBACK_CONFIG.primaryLogoUrl,
      symbolLogoUrl: config.icon || config.symbolLogoUrl || FALLBACK_CONFIG.symbolLogoUrl,
      lightLogoUrl: config.lightLogoUrl || FALLBACK_CONFIG.lightLogoUrl,
      darkLogoUrl: config.darkLogoUrl || FALLBACK_CONFIG.darkLogoUrl,
      faviconUrl: config.icon || config.faviconUrl || FALLBACK_CONFIG.faviconUrl,
    };
  }, [config]);

  return (
    <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
  );
}

export function useBranding() {
  return React.useContext(BrandingContext);
}

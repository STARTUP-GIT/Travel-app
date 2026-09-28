"use client";

import * as React from "react";

import { FALLBACK_CONFIG, type AppConfig } from "../types";
import { getAppConfig } from "../api/app-config.api";

type BrandingContextValue = {
  config: AppConfig;
  appName: string;
  tagline: string;
};

const BrandingContext = React.createContext<BrandingContextValue>({
  config: FALLBACK_CONFIG,
  appName: FALLBACK_CONFIG.app_name,
  tagline: FALLBACK_CONFIG.webTitle || "Explore • Experience • Belong",
});

/**
 * Single source of truth for admin-controlled branding inside client
 * components (logo, splash, top bar, auth screens, footer). Accepts the
 * server-fetched config to avoid a flash of the fallback name.
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

  const value = React.useMemo<BrandingContextValue>(
    () => ({
      config,
      appName: config.app_name || FALLBACK_CONFIG.app_name,
      tagline: config.webTitle || FALLBACK_CONFIG.webTitle,
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

/**
 * App shell context.
 *
 * Two things every screen needs regardless of where it sits in the navigation
 * tree:
 *
 *  1. Admin-controlled branding from `GET /api/settings` (app name, icon,
 *     landing slideshow, legal text). Fetched once per launch, on top of a
 *     neutral fallback, so branding never gates the first paint.
 *  2. Whether the backend is configured at all. A missing base URL is a
 *     deployment mistake, not a runtime error, so it gets its own screen with
 *     instructions instead of an endless spinner.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getAppConfig, FALLBACK_CONFIG } from "@/services/app-config.service";
import { isBackendConfigured } from "@/config";
import type { AppConfig } from "@/types/api";

type AppShellValue = {
  config: AppConfig;
  /** False while the real branding is still being fetched. */
  loadingBranding: boolean;
  /** False when `EXPO_PUBLIC_API_BASE_URL` is missing or malformed. */
  backendConfigured: boolean;
  refresh: () => Promise<void>;
};

const AppShellContext = createContext<AppShellValue | null>(null);

export function AppShellProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(FALLBACK_CONFIG);
  const [loadingBranding, setLoadingBranding] = useState(true);
  const [backendConfigured, setBackendConfigured] = useState(isBackendConfigured());

  const refresh = useCallback(async () => {
    setLoadingBranding(true);
    try {
      setConfig(await getAppConfig());
    } finally {
      setLoadingBranding(false);
    }
  }, []);

  useEffect(() => {
    // The base URL is read once at module load, so re-checking on mount is only
    // about staying in sync if a dev server restart happened under us.
    setBackendConfigured(isBackendConfigured());
    void refresh();
  }, [refresh]);

  const value = useMemo<AppShellValue>(
    () => ({ config, loadingBranding, backendConfigured, refresh }),
    [config, loadingBranding, backendConfigured, refresh],
  );

  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>;
}

export function useAppShell(): AppShellValue {
  const value = useContext(AppShellContext);
  if (!value) {
    throw new Error("useAppShell must be used inside <AppShellProvider>");
  }
  return value;
}

/** Convenience for the many screens that only need the app name. */
export function useAppName(): string {
  return useAppShell().config.app_name;
}
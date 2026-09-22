"use client";

import { SessionProvider } from "next-auth/react";

import { Toaster } from "@/components/ui/sonner";
import { AppConfigProvider } from "@/features/app-config/state/app-config-provider";
import type { AppConfig } from "@/features/app-config/types";
import { CurrentDistrictProvider } from "@/features/locations/state/current-district-provider";
import { FavoritesProvider } from "@/features/favorites/hooks/useFavorites";

export function Providers({
  children,
  initialConfig,
}: {
  children: React.ReactNode;
  initialConfig?: AppConfig | null;
}) {
  return (
    <SessionProvider>
      <AppConfigProvider initialConfig={initialConfig}>
        <CurrentDistrictProvider>
          <FavoritesProvider>
            {children}
            <Toaster position="top-center" />
          </FavoritesProvider>
        </CurrentDistrictProvider>
      </AppConfigProvider>
    </SessionProvider>
  );
}
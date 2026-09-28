"use client";

import { SessionProvider } from "next-auth/react";

import { Toaster } from "@/components/ui/sonner";
import { AppConfigProvider } from "@/features/app-config/state/app-config-provider";
import type { AppConfig } from "@/features/app-config/types";

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
        {children}
        <Toaster position="top-center" />
      </AppConfigProvider>
    </SessionProvider>
  );
}

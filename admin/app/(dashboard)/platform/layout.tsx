"use client";

import * as React from "react";
import { BrandSettingsProvider } from "@/lib/hooks/use-brand-settings";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BrandSettingsProvider>{children}</BrandSettingsProvider>;
}

"use client";

import * as React from "react";
import { useBranding } from "@/features/app-config/state/app-config-provider";
import { FALLBACK_CONFIG } from "@/features/app-config/types";
import { cn } from "@/lib/utils";

function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  const {
    appName,
    brandName,
    tagline,
    symbolLogoUrl,
    primaryColor,
    accentColor,
    isLoading,
  } = useBranding();

  if (compact) {
    return <LogoMark className={className} />;
  }

  // Reserved layout space when loading without any branding resolved yet
  if (isLoading && !appName && !brandName) {
    return (
      <span
        aria-hidden
        className={cn(
          "inline-flex items-center gap-2.5 sm:gap-3 select-none",
          className
        )}
      >
        <span className="size-9 sm:size-10 shrink-0 rounded-xl bg-slate-200/60 dark:bg-zinc-800 animate-pulse" />
        <span className="flex flex-col gap-1 leading-none">
          <span className="h-4 sm:h-5 w-28 sm:w-36 rounded bg-slate-200/60 dark:bg-zinc-800 animate-pulse" />
          <span className="h-2 sm:h-2.5 w-36 sm:w-48 rounded bg-slate-200/40 dark:bg-zinc-850 animate-pulse mt-0.5" />
        </span>
      </span>
    );
  }

  const displayName = (appName || brandName || FALLBACK_CONFIG.brandName).trim();
  const displayTagline = (tagline || FALLBACK_CONFIG.tagline).trim();

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 sm:gap-3 font-bold tracking-tight select-none",
        className
      )}
    >
      <img
        src={symbolLogoUrl || FALLBACK_CONFIG.symbolLogoUrl || "/brand/atlaswanders-symbol.svg"}
        alt={displayName}
        className="size-9 sm:size-10 shrink-0 object-contain drop-shadow-xs"
      />
      <span className="flex flex-col leading-none">
        <span
          className="text-[1.15rem] sm:text-[1.3rem] font-black tracking-tight"
          style={{ color: primaryColor || FALLBACK_CONFIG.primaryColor }}
        >
          {displayName}
        </span>
        <span
          className="text-[0.62rem] sm:text-[0.72rem] font-bold tracking-[0.14em] uppercase mt-0.5 whitespace-nowrap"
          style={{ color: accentColor || FALLBACK_CONFIG.accentColor }}
        >
          {displayTagline}
        </span>
      </span>
    </span>
  );
}

function LogoMark({ className }: { className?: string }) {
  const { symbolLogoUrl, appName, brandName } = useBranding();
  const displayName = (appName || brandName || FALLBACK_CONFIG.brandName).trim();
  return (
    <span
      className={cn(
        "flex size-9 sm:size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#0B2545] p-1 shadow-[0_4px_14px_rgba(11,37,69,0.35)] border border-[#0E3A6C]",
        className
      )}
    >
      <img
        src={symbolLogoUrl || FALLBACK_CONFIG.symbolLogoUrl || "/brand/atlaswanders-symbol.svg"}
        alt={displayName}
        className="size-7 sm:size-8 object-contain"
      />
    </span>
  );
}

export { Logo, LogoMark };

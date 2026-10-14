"use client";

import * as React from "react";
import { useBranding } from "@/features/app-config/state/app-config-provider";
import { cn } from "@/lib/utils";

function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  const {
    appName,
    brandName,
    tagline,
    symbolLogoUrl,
    primaryColor,
    accentColor,
  } = useBranding();

  if (compact) {
    return <LogoMark className={className} />;
  }

  const displayName = (appName || brandName || "ATLASWANDERS").trim();
  const displayTagline = (tagline || "Partner & Service Provider Portal").trim();

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 sm:gap-3 font-bold tracking-tight select-none",
        className
      )}
    >
      <img
        src={symbolLogoUrl || "/brand/atlaswanders-symbol.svg"}
        alt={displayName}
        className="size-9 sm:size-10 shrink-0 object-contain drop-shadow-xs"
      />
      <span className="flex flex-col leading-none">
        <span
          className="text-[1.15rem] sm:text-[1.3rem] font-black tracking-tight"
          style={{ color: primaryColor || "#0B2545" }}
        >
          {displayName}
        </span>
        <span
          className="text-[0.62rem] sm:text-[0.72rem] font-bold tracking-[0.14em] uppercase mt-0.5 whitespace-nowrap"
          style={{ color: accentColor || "#D9A441" }}
        >
          {displayTagline}
        </span>
      </span>
    </span>
  );
}

function LogoMark({ className }: { className?: string }) {
  const { symbolLogoUrl, appName, brandName } = useBranding();
  const displayName = appName || brandName || "ATLASWANDERS Provider";
  return (
    <span
      className={cn(
        "flex size-9 sm:size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#0B2545] p-1 shadow-[0_4px_14px_rgba(11,37,69,0.35)] border border-[#0E3A6C]",
        className
      )}
    >
      <img
        src={symbolLogoUrl || "/brand/atlaswanders-symbol.svg"}
        alt={displayName}
        className="size-7 sm:size-8 object-contain"
      />
    </span>
  );
}

export { Logo, LogoMark };

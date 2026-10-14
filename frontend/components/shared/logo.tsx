"use client";

import * as React from "react";
import { useBranding } from "@/features/app-config/state/app-config-provider";
import { cn } from "@/lib/utils";

function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  const {
    brandName,
    tagline,
    symbolLogoUrl,
    primaryColor,
    secondaryColor,
    accentColor,
  } = useBranding();

  if (compact) {
    return <LogoMark className={className} />;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 font-bold tracking-tight select-none",
        className
      )}
    >
      <img
        src={symbolLogoUrl || "/brand/atlaswanders-symbol.svg"}
        alt={brandName || "ATLASWANDERS"}
        className="size-9 shrink-0 object-contain drop-shadow-xs"
      />
      <span className="flex flex-col leading-none">
        <span className="text-[1.1rem] font-black tracking-tight flex items-center">
          <span style={{ color: primaryColor || "#0B2545" }}>ATLAS</span>
          <span style={{ color: secondaryColor || "#087E8B" }}>WANDERS</span>
        </span>
        <span
          className="text-[0.58rem] font-bold tracking-[0.18em] uppercase mt-0.5 truncate max-w-[180px]"
          style={{ color: accentColor || "#D9A441" }}
        >
          {tagline || "Discover Places. Experience Local."}
        </span>
      </span>
    </span>
  );
}

function LogoMark({ className }: { className?: string }) {
  const { symbolLogoUrl, brandName } = useBranding();
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#0B2545] p-1 shadow-[0_4px_14px_rgba(11,37,69,0.35)] border border-[#0E3A6C]",
        className
      )}
    >
      <img
        src={symbolLogoUrl || "/brand/atlaswanders-symbol.svg"}
        alt={brandName || "ATLASWANDERS"}
        className="size-7 object-contain"
      />
    </span>
  );
}

export { Logo, LogoMark };
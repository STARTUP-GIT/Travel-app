"use client";

import * as React from "react";

import { useBranding } from "@/features/app-config/state/app-config-provider";
import { cn } from "@/lib/utils";

function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { appName, tagline } = useBranding();

  const words = appName.trim().split(/\s+/);
  const head = words[0] ?? appName;
  const tail = words.length > 1 ? words.slice(1).join(" ") : null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-bold tracking-tight",
        className
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-blue-700 via-primary to-indigo-700 shadow-[0_6px_18px_rgb(30_64_175_/_0.45)]">
        <svg viewBox="0 0 24 24" className="size-5 text-white" fill="currentColor" aria-hidden>
          <path d="M3 4.5h7l2 3 2-3h7a.5.5 0 0 1 .5.5v13a.5.5 0 0 1-.5.5h-7l-2-3-2 3H3a.5.5 0 0 1-.5-.5V5A.5.5 0 0 1 3 4.5Z" opacity="0.28" />
          <circle cx="12" cy="7.5" r="1.6" />
          <path d="M4 9.5h4v1.6H4zM16 9.5h4v1.6h-4zM12 3.4l.9 1.7 1.9.3-1.4 1.4.3 1.9-1.7-.9-1.7.9.3-1.9-1.4-1.4 1.9-.3z" />
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span className="max-w-[8rem] truncate text-gradient-royal text-[1.05rem]">
          {head}
        </span>
        {!compact ? (
          <span className="max-w-[8rem] truncate text-[0.6rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            {tail ?? tagline}
          </span>
        ) : null}
      </span>
    </span>
  );
}

function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-blue-700 via-primary to-indigo-700 shadow-[0_6px_18px_rgb(30_64_175_/_0.45)]",
        className
      )}
    >
      <svg viewBox="0 0 24 24" className="size-5 text-white" fill="currentColor" aria-hidden>
        <path d="M3 4.5h7l2 3 2-3h7a.5.5 0 0 1 .5.5v13a.5.5 0 0 1-.5.5h-7l-2-3-2 3H3a.5.5 0 0 1-.5-.5V5A.5.5 0 0 1 3 4.5Z" opacity="0.28" />
        <circle cx="12" cy="7.5" r="1.6" />
        <path d="M4 9.5h4v1.6H4zM16 9.5h4v1.6h-4zM12 3.4l.9 1.7 1.9.3-1.4 1.4.3 1.9-1.7-.9-1.7.9.3-1.9-1.4-1.4 1.9-.3z" />
      </svg>
    </span>
  );
}

export { Logo, LogoMark };
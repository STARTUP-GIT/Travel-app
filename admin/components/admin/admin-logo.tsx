import * as React from "react";
import { cn } from "@/lib/utils";

/** ATLASWANDERS admin brand mark. */
export function AdminLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <img
        src="/brand/atlaswanders-symbol.svg"
        alt="ATLASWANDERS"
        className="h-8 w-8 object-contain shrink-0"
      />
      <span className="flex flex-col leading-none">
        <span className="text-sm font-bold tracking-tight text-foreground">
          ATLAS<span className="text-[#087E8B]">WANDERS</span>
        </span>
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Admin Portal
        </span>
      </span>
    </span>
  );
}
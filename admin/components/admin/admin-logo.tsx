import * as React from "react";

import { cn } from "@/lib/utils";

/** Monochrome admin brand mark. */
export function AdminLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="flex size-9 items-center justify-center rounded-lg bg-zinc-900 font-mono text-sm font-bold text-white shadow-md">
        A
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-sm font-bold tracking-tight">Admin</span>
        <span className="text-[0.6rem] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          Control Panel
        </span>
      </span>
    </span>
  );
}
import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-10 w-full min-w-0 rounded-lg border bg-white/5 px-3 py-1 text-base shadow-[inset_0_1px_2px_rgb(0_0_0_/_0.2)] transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus:border-primary/60 focus:ring-2 focus:ring-ring/30 md:text-sm",
        className
      )}
      {...props}
    />
  );
}

export { Input };
import * as React from "react";
import { cn } from "@/lib/utils";

const GlassCard = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & { hover?: boolean }
>(({ className, hover = false, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="glass-card"
    className={cn(
      "card-surface relative flex flex-col overflow-hidden rounded-2xl",
      hover && "card-surface-hover",
      className
    )}
    {...props}
  />
));
GlassCard.displayName = "GlassCard";

export { GlassCard };
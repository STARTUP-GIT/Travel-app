import { Star, StarHalf } from "lucide-react";

import { cn } from "@/lib/utils";

type RatingProps = {
  value: number | null | undefined;
  count?: number | null;
  className?: string;
  showValue?: boolean;
  size?: "xs" | "sm" | "md";
};

export function Rating({
  value,
  count,
  className,
  showValue = true,
  size = "sm",
}: RatingProps) {
  if (value === null || value === undefined || value <= 0) {
    return null;
  }

  const full = Math.floor(value);
  const hasHalf = value - full >= 0.4;
  const starClass =
    size === "md" ? "size-[18px]" : size === "xs" ? "size-3" : "size-4";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        size === "md" ? "text-base" : "text-sm",
        className
      )}
      aria-label={`Rated ${value.toFixed(1)} out of 5`}
    >
      <span className="flex items-center" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => {
          if (i < full) {
            return (
              <Star key={i} className={cn(starClass, "fill-amber-400 text-amber-400")} />
            );
          }
          if (i === full && hasHalf) {
            return (
              <span key={i} className="relative">
                <Star className={cn(starClass, "text-amber-400/40")} />
                <StarHalf
                  className={cn(starClass, "absolute inset-0 fill-amber-400 text-amber-400")}
                />
              </span>
            );
          }
          return <Star key={i} className={cn(starClass, "text-amber-400/35")} />;
        })}
      </span>
      {showValue || typeof count === "number" ? (
        <span className="text-slate-500">
          {showValue ? (
            <b className="font-semibold text-foreground">{value.toFixed(1)}</b>
          ) : null}
          {typeof count === "number" ? (
            <span className="text-muted-foreground"> ({count})</span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
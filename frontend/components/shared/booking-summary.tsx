import * as React from "react";

import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function BookingSummary({
  title,
  rows,
  total,
  totalLabel = "Total",
  className,
  footer,
}: {
  title: string;
  rows: { label: React.ReactNode; value: React.ReactNode; strong?: boolean }[];
  total?: React.ReactNode;
  totalLabel?: string;
  className?: string;
  footer?: React.ReactNode;
}) {
  return (
    <div className={cn("card-surface rounded-2xl p-5", className)}>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </h3>
      <dl className="mt-4 space-y-3">
        {rows.map((row, i) => (
          <div
            key={i}
            className={cn(
              "flex items-start justify-between gap-4 text-sm leading-relaxed",
              row.strong ? "font-semibold text-foreground" : "text-muted-foreground"
            )}
          >
            <dt className="min-w-0">{row.label}</dt>
            <dd className="text-right font-medium text-foreground">{row.value}</dd>
          </div>
        ))}
      </dl>
      {total ? (
        <>
          <Separator className="my-5" />
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {totalLabel}
            </span>
            <span className="text-base font-bold text-primary">{total}</span>
          </div>
        </>
      ) : null}
      {footer ? <div className="mt-5">{footer}</div> : null}
    </div>
  );
}
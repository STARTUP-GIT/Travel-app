import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export function SectionHeader({
  title,
  subtitle,
  action,
  href,
  actionLabel = "See all",
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  href?: string;
  actionLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-3.5 flex items-end justify-between gap-3",
        className
      )}
    >
      <div className="min-w-0">
        <h2 className="text-[1.05rem] font-bold tracking-tight">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ??
        (href ? (
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-primary active:opacity-70"
          >
            {actionLabel}
            <ChevronRight className="size-3.5" />
          </Link>
        ) : null)}
    </div>
  );
}
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

export type ServiceItem = {
  id: string;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  href?: string;
  accent?: "blue" | "green" | "amber" | "rose";
};

const ACCENTS: Record<NonNullable<ServiceItem["accent"]>, string> = {
  blue: "bg-primary/10 text-primary",
  green: "bg-success/12 text-emerald-700",
  amber: "bg-amber-400/16 text-amber-700",
  rose: "bg-rose-500/10 text-rose-600",
};

export function ServiceCard({
  item,
  onClick,
  className,
}: {
  item: ServiceItem;
  onClick?: () => void;
  className?: string;
}) {
  const Icon = item.icon;
  const inner = (
    <>
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-2xl",
          ACCENTS[item.accent ?? "blue"]
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{item.title}</span>
        {item.subtitle ? (
          <span className="block truncate text-xs text-muted-foreground">
            {item.subtitle}
          </span>
        ) : null}
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </>
  );

  const cls = cn(
    "card-surface flex items-center gap-3 rounded-2xl p-3 text-left transition-all active:scale-[0.98]",
    item.href && "card-surface-hover",
    className
  );

  if (item.href) {
    return (
      <Link href={item.href} className={cls} onClick={onClick}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} onClick={onClick}>
      {inner}
    </button>
  );
}

export function ServiceGrid({
  items,
  onSelect,
  className,
}: {
  items: ServiceItem[];
  onSelect?: (item: ServiceItem) => void;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", className)}>
      {items.map((item) => (
        <ServiceCard key={item.id} item={item} onClick={() => onSelect?.(item)} />
      ))}
    </div>
  );
}
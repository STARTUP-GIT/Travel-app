import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  href,
  suffix,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  href?: string;
  suffix?: string;
}) {
  const inner = (
    <div
      className={cn(
        "mono-card flex items-center gap-3 p-4 transition-colors",
        href && "hover:bg-accent/50"
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-bold leading-none tracking-tight">
          {value}
          {suffix ? <span className="ml-1 text-sm font-medium text-muted-foreground">{suffix}</span> : null}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );

  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}
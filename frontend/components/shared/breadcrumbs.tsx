import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export type Crumb = {
  label: string;
  href?: string;
};

export function Breadcrumbs({
  items,
  className,
}: {
  items: Crumb[];
  className?: string;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-1.5 overflow-hidden text-sm", className)}
    >
      <ol className="flex min-w-0 items-center gap-1.5">
        <li className="flex shrink-0 items-center">
          <Link
            href="/"
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <Home className="size-3.5" />
            <span className="hidden sm:inline">Home</span>
          </Link>
        </li>
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li
              key={`${item.label}-${i}`}
              className="flex min-w-0 items-center gap-1.5"
            >
              <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" />
              {isLast || !item.href ? (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className="truncate text-muted-foreground last:text-foreground"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="shrink-0 rounded-md px-1.5 py-0.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
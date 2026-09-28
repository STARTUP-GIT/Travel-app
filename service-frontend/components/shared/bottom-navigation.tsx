"use client";

import { Inbox, LayoutDashboard, Store, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    match: (p: string) => p === "/dashboard",
  },
  {
    href: "/services",
    label: "Services",
    icon: Store,
    match: (p: string) => p.startsWith("/services"),
  },
  {
    href: "/requests",
    label: "Requests",
    icon: Inbox,
    match: (p: string) => p.startsWith("/requests"),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: User,
    match: (p: string) => p.startsWith("/profile") || p.startsWith("/settings"),
  },
] as const;

/** Persistent mobile bottom navigation for the provider app. */
export function BottomNavigation({ pending }: { pending: number }) {
  const pathname = usePathname();

  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-card/95 pb-[max(env(safe-area-inset-bottom),0.25rem)] shadow-[0_-6px_24px_-12px_rgb(15_30_90_/_0.18)] backdrop-blur-xl lg:hidden"
      aria-label="Primary mobile navigation"
    >
      <div className="grid grid-cols-4">
        {ITEMS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group relative flex flex-col items-center gap-1 py-2 text-[0.65rem] font-medium transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={cn(
                  "relative flex h-7 w-12 items-center justify-center rounded-full transition-all",
                  active && "bg-primary/10"
                )}
              >
                <Icon
                  className={cn(
                    "size-[21px] transition-transform",
                    active && "scale-105"
                  )}
                  strokeWidth={active ? 2.4 : 2}
                />
                {href === "/requests" && pending > 0 ? (
                  <span className="absolute -top-0.5 right-1 flex size-4 items-center justify-center rounded-full bg-amber-500 text-[0.55rem] font-bold text-white">
                    {pending > 9 ? "9+" : pending}
                  </span>
                ) : null}
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

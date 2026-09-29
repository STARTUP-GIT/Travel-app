"use client";

import { Bookmark, Compass, Home, MapPinned, User, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useDistrictShell } from "@/features/locations/hooks/useDistrictShell";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  icon: LucideIcon;
  href: string;
  /** Matched exactly instead of as a prefix, for the district root. */
  exact?: boolean;
  matches: (pathname: string) => boolean;
};

/**
 * District mobile bottom navigation: Home, Places, Guides, Saved, Profile.
 *
 * It is part of the district application shell, so it renders only once a
 * district is actually selected. On the global landing page, during the
 * destination-selection flow and on the auth screens there is no district, and
 * this bar must not appear at all.
 */
export function BottomNavigation() {
  const pathname = usePathname();
  const { base, isDistrictApp } = useDistrictShell();

  if (!isDistrictApp || !base) return null;

  const items: NavItem[] = [
    {
      label: "Home",
      icon: Home,
      href: base,
      exact: true,
      matches: (p) => p === base,
    },
    {
      label: "Places",
      icon: MapPinned,
      href: `${base}/places`,
      matches: (p) =>
        p.includes("/places") || p.includes("/hotels") || p.includes("/restaurants"),
    },
    {
      label: "Guides",
      icon: Compass,
      href: `${base}/guides`,
      matches: (p) => p.includes("/guides"),
    },
    {
      // Saved is the visitor's own data, kept inside the selected district's
      // navigation rather than scoped to it.
      label: "Saved",
      icon: Bookmark,
      href: "/favorites",
      matches: (p) => p.startsWith("/favorites"),
    },
    {
      label: "Profile",
      icon: User,
      href: "/profile",
      matches: (p) => p.startsWith("/profile"),
    },
  ];

  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-card/95 pb-[max(env(safe-area-inset-bottom),0.25rem)] shadow-[0_-6px_24px_-12px_rgb(15_30_90_/_0.18)] backdrop-blur-xl lg:hidden"
      aria-label="District navigation"
    >
      <div className="grid grid-cols-5">
        {items.map(({ href, label, icon: Icon, exact, matches }) => {
          const active = matches(pathname) || (!exact && pathname.startsWith(href));
          return (
            <Link
              key={label}
              href={href}
              className={cn(
                "group relative flex flex-col items-center gap-1 py-2 text-[0.65rem] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={cn(
                  "flex h-7 w-12 items-center justify-center rounded-full transition-all",
                  active && "bg-primary/10"
                )}
              >
                <Icon
                  className={cn("size-[21px] transition-transform", active && "scale-105")}
                  strokeWidth={active ? 2.4 : 2}
                />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

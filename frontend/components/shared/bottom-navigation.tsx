"use client";

import { Compass, Home, MapPinned, User, Bookmark } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useCurrentDistrict } from "@/features/locations/state/current-district-provider";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  {
    href: "/explore",
    label: "Places",
    icon: MapPinned,
    match: (p: string) =>
      p.includes("/places") ||
      p.includes("/hotels") ||
      p.includes("/restaurants") ||
      p.startsWith("/explore") ||
      (p === "/explore-karnataka" && false),
  },
  {
    href: "/guides",
    label: "Guides",
    icon: Compass,
    match: (p: string) => p.includes("/guides"),
  },
  {
    href: "/favorites",
    label: "Saved",
    icon: Bookmark,
    match: (p: string) => p.startsWith("/favorites"),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: User,
    match: (p: string) => p.startsWith("/profile"),
  },
] as const;

/**
 * Persistent mobile bottom navigation. The district-aware entries (Places,
 * Guides) resolve to the currently selected district; they fall back to the
 * Explore Karnataka screen when no district has been chosen yet.
 */
export function BottomNavigation() {
  const pathname = usePathname();
  const { slug } = useCurrentDistrict();

  const resolved = ITEMS.map((item) => {
    if (item.label === "Places") {
      return { ...item, href: slug ? `/${slug}/places` : "/explore" };
    }
    if (item.label === "Guides") {
      return { ...item, href: slug ? `/${slug}/guides` : "/explore" };
    }
    return item;
  });

  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-card/95 pb-[max(env(safe-area-inset-bottom),0.25rem)] shadow-[0_-6px_24px_-12px_rgb(15_30_90_/_0.18)] backdrop-blur-xl lg:hidden"
      aria-label="Primary mobile navigation"
    >
      <div className="grid grid-cols-5">
        {resolved.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname) || pathname.startsWith(href) && href !== "/";
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
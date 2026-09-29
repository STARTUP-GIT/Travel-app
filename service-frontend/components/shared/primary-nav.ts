import { Inbox, LayoutDashboard, Store, User, type LucideIcon } from "lucide-react";

/**
 * The four primary destinations of the provider app, in one place.
 *
 * The mobile bottom bar and the desktop account menu both render this list, so
 * the two can never drift onto different routes or different active states, and
 * there is no second routing definition to keep in sync.
 *
 * These are the real application routes: they are the pages that exist under
 * `app/(provider)`, which is the only route group a signed-in provider reaches.
 */
export type PrimaryNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Active-state test against `usePathname()`. */
  match: (pathname: string) => boolean;
};

export const PRIMARY_NAV: PrimaryNavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    match: (pathname) => pathname === "/dashboard",
  },
  {
    href: "/services",
    label: "Services",
    icon: Store,
    // Owns the listing detail and the new-listing screen.
    match: (pathname) => pathname.startsWith("/services"),
  },
  {
    href: "/requests",
    label: "Requests",
    icon: Inbox,
    // Owns the request detail screen.
    match: (pathname) => pathname.startsWith("/requests"),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: User,
    // Settings is an account screen, so the Profile tab stays lit while it is
    // open rather than leaving the whole menu with nothing highlighted.
    match: (pathname) =>
      pathname.startsWith("/profile") || pathname.startsWith("/settings"),
  },
];

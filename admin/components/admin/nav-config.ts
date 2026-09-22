import {
  Building2,
  CalendarClock,
  Flag,
  Hotel,
  LayoutDashboard,
  MapPin,
  MessageSquareQuote,
  PackageOpen,
  Settings2,
  Store,
  UserCog,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

export const NAVIGATION: NavSection[] = [
  {
    label: "Overview",
    items: [{ title: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Locations",
    items: [
      { title: "States", href: "/states", icon: Flag },
      { title: "Districts", href: "/districts", icon: MapPin },
    ],
  },
  {
    label: "Content",
    items: [
      { title: "Places", href: "/places", icon: PackageOpen },
      { title: "Place Requests", href: "/submissions", icon: CalendarClock },
      { title: "Guides", href: "/guides", icon: UserCog },
      { title: "Hotels", href: "/hotels", icon: Hotel },
      { title: "Restaurants", href: "/restaurants", icon: UtensilsCrossed },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Bookings", href: "/bookings", icon: Building2 },
      { title: "Owners", href: "/owners", icon: Store },
      { title: "Users", href: "/users", icon: Users },
      { title: "Reviews", href: "/reviews", icon: MessageSquareQuote },
    ],
  },
  {
    label: "Settings",
    items: [
      { title: "Branding & Landing", href: "/branding", icon: Settings2 },
      { title: "My Profile", href: "/profile", icon: UserCog },
    ],
  },
];
import {
  Bell,
  Building2,
  CalendarClock,
  CreditCard,
  FileSpreadsheet,
  Flag,
  History,
  Hotel,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  MapPin,
  MessageSquareQuote,
  PackageOpen,
  Settings2,
  ShieldCheck,
  ShieldCheck as ShieldUser,
  Smartphone,
  Store,
  Ticket,
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
    label: "User & Access Management",
    items: [
      { title: "Users", href: "/users", icon: Users },
      { title: "Guides", href: "/guides", icon: UserCog },
      { title: "Owners", href: "/owners", icon: Store },
      { title: "Roles & Permissions", href: "/roles", icon: ShieldUser },
    ],
  },
  {
    label: "Locations & Catalog",
    items: [
      { title: "States", href: "/states", icon: Flag },
      { title: "Districts", href: "/districts", icon: MapPin },
      { title: "Places", href: "/places", icon: PackageOpen },
      { title: "Place Requests", href: "/submissions", icon: CalendarClock },
      { title: "Hotels", href: "/hotels", icon: Hotel },
      { title: "Restaurants", href: "/restaurants", icon: UtensilsCrossed },
      { title: "Coupons & Discounts", href: "/coupons", icon: Ticket },
    ],
  },
  {
    label: "Operations & Support",
    items: [
      { title: "Bookings", href: "/bookings", icon: Building2 },
      { title: "Payments & Revenue", href: "/payments", icon: CreditCard },
      { title: "Reports & Exports", href: "/reports", icon: FileSpreadsheet },
      { title: "Support Tickets", href: "/tickets", icon: LifeBuoy },
      { title: "Notifications", href: "/notifications", icon: Bell },
      { title: "Reviews & Moderation", href: "/reviews", icon: MessageSquareQuote },
    ],
  },
  {
    label: "System & Config",
    items: [
      { title: "Approvals", href: "/approvals", icon: ShieldCheck },
      { title: "Branding & Landing", href: "/branding", icon: Settings2 },
      { title: "App Version Control", href: "/version-control", icon: Smartphone },
      { title: "Audit Logs", href: "/audit-logs", icon: History },
      { title: "Active Sessions", href: "/sessions", icon: KeyRound },
      { title: "My Profile", href: "/profile", icon: UserCog },
    ],
  },
];
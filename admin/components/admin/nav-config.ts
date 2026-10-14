import {
  Bell,
  Bookmark,
  Building2,
  CalendarClock,
  Compass,
  CreditCard,
  Eye,
  FileSpreadsheet,
  Flag,
  Globe,
  History,
  Hotel,
  Image,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  MapPin,
  MessageSquareQuote,
  PackageOpen,
  Palette,
  Settings2,
  ShieldCheck,
  ShieldCheck as ShieldUser,
  Smartphone,
  Sparkles,
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
    label: "Brand & Identity",
    items: [
      { title: "Branding", href: "/platform/branding", icon: Palette },
      { title: "Logo", href: "/platform/logo", icon: Image },
      { title: "Icon / Favicon", href: "/platform/icon", icon: Sparkles },
      { title: "SEO", href: "/platform/seo", icon: Globe },
      { title: "Browser Title", href: "/platform/browser-title", icon: Bookmark },
      { title: "Live Brand Preview", href: "/platform/live-preview", icon: Eye },
    ],
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
      { title: "Landing & Banners", href: "/branding", icon: Settings2 },
      { title: "App Version Control", href: "/version-control", icon: Smartphone },
      { title: "Audit Logs", href: "/audit-logs", icon: History },
      { title: "Active Sessions", href: "/sessions", icon: KeyRound },
      { title: "My Profile", href: "/profile", icon: UserCog },
    ],
  },
];
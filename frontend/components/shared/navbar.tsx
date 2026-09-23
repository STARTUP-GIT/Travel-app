"use client";

import {
  CalendarDays,
  ChevronDown,
  Compass,
  Hotel,
  Menu,
  Mountain,
  Soup,
  User,
  LogOut,
  LogIn,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

import { Logo } from "@/components/shared/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useCurrentDistrict } from "@/features/locations/state/current-district-provider";
import type { DistrictSummary } from "@/features/locations/types";
import { cn } from "@/lib/utils";

const NAV_RESOURCES = [
  { label: "Places", icon: Mountain, segment: "places" },
  { label: "Hotels", icon: Hotel, segment: "hotels" },
  { label: "Restaurants", icon: Soup, segment: "restaurants" },
  { label: "Guides", icon: Compass, segment: "guides" },
] as const;

export function Navbar({ districts }: { districts: DistrictSummary[] }) {
  const pathname = usePathname();
  const { isAuthenticated, user, isLoading, logout } = useAuth();
  const { slug: districtSlug, stateSlug, setSlug } = useCurrentDistrict();

  const districtPath = (segment: string) => {
    if (stateSlug && districtSlug) {
      return `/${stateSlug}/${districtSlug}/${segment}`;
    }
    return districtSlug ? `/${districtSlug}/${segment}` : "/districts";
  };

  const firstName = user?.name?.split(" ")[0] ?? "Customer";

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[oklch(0.14_0.04_256_/_0.7)] backdrop-blur-2xl">
      <nav
        className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8"
        aria-label="Main navigation"
      >
        <Link href="/" className="shrink-0" aria-label="Karnataka Tourism home">
          <Logo />
        </Link>

        {/* Desktop navigation */}
        <div className="hidden items-center gap-0.5 xl:flex">
          <NavLink href="/" active={isActive("/")} label="Home" />
          <NavLink
            href="/districts"
            active={isActive("/districts")}
            label="Districts"
          />
          {NAV_RESOURCES.map((item) => {
            const href = districtPath(item.segment);
            return (
              <NavLink
                key={item.segment}
                href={href}
                active={isActive(href)}
                label={item.label}
              />
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <DistrictMenu districts={districts} currentSlug={districtSlug} onSelect={setSlug} />

          {isLoading ? null : isAuthenticated ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-10 gap-2 rounded-full px-2 pr-3"
                    aria-label="Account menu"
                  >
                    <Avatar className="size-8">
                      {user?.image ? <AvatarImage src={user.image} alt={user?.name ?? "Profile"} /> : null}
                      <AvatarFallback>
                        {firstName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden max-w-24 truncate text-sm font-medium md:inline">
                      {firstName}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <span className="block truncate">{user?.name}</span>
                    <span className="block truncate text-xs font-normal text-muted-foreground">
                      {user?.email}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/bookings" className="flex items-center gap-2">
                      <CalendarDays className="size-4" /> My Bookings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-2">
                      <User className="size-4" /> Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => logout()} className="flex items-center gap-2 text-red-300">
                    <LogOut className="size-4" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button asChild variant="glass" size="sm" className="rounded-full">
              <Link href="/login">
                <LogIn className="size-4" />
                <span className="hidden sm:inline">Login</span>
              </Link>
            </Button>
          )}

          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="xl:hidden"
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[85%] max-w-sm overflow-y-auto"
            >
              <SheetHeader>
                <SheetTitle>
                  <Logo />
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-1 px-2">
                {isAuthenticated ? (
                  <div className="mb-2 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                    <Avatar>
                      {user?.image ? <AvatarImage src={user.image} alt={user?.name ?? "Profile"} /> : null}
                      <AvatarFallback>{firstName.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{user?.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>
                ) : null}

                <MobileLink href="/" label="Home" />
                <MobileLink href="/districts" label="Browse Districts" />

                <Separator className="my-2" />

                <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {districtSlug ? "Explore this district" : "Choose a district first"}
                </p>
                {NAV_RESOURCES.map((item) => {
                  const href = districtPath(item.segment);
                  const Icon = item.icon;
                  return (
                    <SheetClose asChild key={item.segment}>
                      <Link
                        href={href}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-white/10"
                      >
                        <Icon className="size-4 text-sky-300" />
                        {item.label}
                        {!districtSlug ? <Badge variant="glass" className="ml-auto">Pick district</Badge> : null}
                      </Link>
                    </SheetClose>
                  );
                })}

                <Separator className="my-2" />

                {isAuthenticated ? (
                  <>
                    <MobileLink href="/bookings" label="My Bookings" icon={<CalendarDays className="size-4 text-sky-300" />} />
                    <MobileLink href="/profile" label="Profile" icon={<User className="size-4 text-sky-300" />} />
                    <Button
                      variant="ghost"
                      className="justify-start gap-3 px-3 text-red-300"
                      onClick={() => logout()}
                    >
                      <LogOut className="size-4" /> Logout
                    </Button>
                  </>
                ) : (
                  <SheetClose asChild>
                    <Button asChild variant="glass" className="mt-2 w-full">
                      <Link href="/login">
                        <LogIn className="size-4" /> Login / Sign up
                      </Link>
                    </Button>
                  </SheetClose>
                )}

                <Separator className="my-2" />

                <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Jump to district
                </p>
                <DistrictMenu
                  districts={districts}
                  currentSlug={districtSlug}
                  onSelect={setSlug}
                  sidebar
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-white/10 text-foreground"
          : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
      )}
    >
      {label}
    </Link>
  );
}

function MobileLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <SheetClose asChild>
      <Link
        href={href}
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-white/10"
      >
        {icon}
        {label}
      </Link>
    </SheetClose>
  );
}

function DistrictMenu({
  districts,
  currentSlug,
  onSelect,
  sidebar = false,
}: {
  districts: DistrictSummary[];
  currentSlug: string | null;
  onSelect: (slug: string) => void;
  sidebar?: boolean;
}) {
  const current = districts.find((d) => d.slug === currentSlug);
  const pathname = usePathname();
  const router = useRouter();

  function handleSelect(slug: string) {
    onSelect(slug);
    const segment = pathname
      .split("/")
      .filter(Boolean)
      .find((part): part is string => part === "places" || part === "hotels" || part === "restaurants" || part === "guides");
    router.push(segment ? `/${slug}/${segment}` : `/${slug}`);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-1 rounded-full", sidebar && "w-full")}>
          <Compass className="size-4" />
          {current?.name ?? "District"}
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 w-60 overflow-y-auto">
        <DropdownMenuLabel>Districts in Karnataka</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {districts.length === 0 ? (
          <p className="px-2 py-2 text-xs text-muted-foreground">
            No districts available yet.
          </p>
        ) : (
          districts.map((d) => (
            <DropdownMenuItem
              key={d.id}
              onSelect={() => handleSelect(d.slug)}
              className="flex items-center justify-between gap-2"
            >
              <span>{d.name}</span>
              <span className="text-xs text-muted-foreground">
                {d.hotelCount + d.restaurantCount + d.placeCount}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
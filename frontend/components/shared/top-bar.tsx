"use client";

import { Bell } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/shared/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBranding } from "@/features/app-config/state/app-config-provider";
import { cn } from "@/lib/utils";

function TopBar() {
  const { isAuthenticated, user, isLoading, logout } = useAuth();
  const { appName } = useBranding();

  const firstName = user?.name?.split(" ")[0] ?? "Customer";

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between gap-3 px-4 lg:px-8 lg:h-16 w-full">
        <Link href="/" aria-label={`${appName} home`} className="shrink-0">
          <Logo />
        </Link>

        <div className="flex items-center gap-1.5 lg:gap-2">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="size-9 rounded-full lg:size-10"
            aria-label="Notifications"
          >
            <Link href="/about">
              <Bell className="size-[18px]" />
            </Link>
          </Button>

          {isLoading ? (
            <div className="size-9 animate-pulse rounded-full bg-muted lg:size-10" />
          ) : isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9 rounded-full lg:size-10"
                  aria-label="Account menu"
                >
                  <Avatar className="size-8 lg:size-9">
                    {user?.image ? (
                      <AvatarImage src={user.image} alt={user?.name ?? "Profile"} />
                    ) : null}
                    <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                      {firstName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel>
                  <span className="block truncate">{user?.name}</span>
                  <span className="block truncate text-xs font-normal text-muted-foreground">
                    {user?.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/bookings">My Bookings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/favorites">Favorites</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => logout()}>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" className="rounded-full h-9 px-4">
              <Link href="/login">Login</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

export { TopBar };
"use client";

import { LayoutDashboard, LogOut, Settings, Store, User, Inbox } from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";

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
import { useBranding } from "@/features/app-config/state/app-config-provider";
import { providerMeta } from "@/features/provider/config";
import type { ProviderKind } from "@/features/provider/types";

export type TopBarIdentity = {
  kind: ProviderKind;
  name: string;
  email: string;
  image: string | null;
  pendingRequests: number;
};

const MENU = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/services", label: "My services", icon: Store },
  { href: "/requests", label: "Requests", icon: Inbox },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function TopBar({ identity }: { identity: TopBarIdentity }) {
  const { appName } = useBranding();
  const meta = providerMeta(identity.kind);
  const initial = (identity.name || identity.email).charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="flex h-14 w-full items-center justify-between gap-3 px-4 lg:h-16 lg:px-8">
        <Link href="/dashboard" aria-label={`${appName} dashboard`} className="shrink-0">
          <Logo />
        </Link>

        <div className="flex items-center gap-1.5 lg:gap-2">
          <Badge variant="info" className="hidden sm:inline-flex">
            {meta.label} portal
          </Badge>

          {identity.pendingRequests > 0 ? (
            <Badge
              variant="warning"
              className="hidden sm:inline-flex"
              aria-label={`${identity.pendingRequests} requests need a reply`}
            >
              {identity.pendingRequests} to reply
            </Badge>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 rounded-full lg:size-10"
                aria-label="Account menu"
              >
                <Avatar className="size-8 lg:size-9">
                  {identity.image ? (
                    <AvatarImage src={identity.image} alt={identity.name} />
                  ) : null}
                  <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                    {initial}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>
                <span className="block truncate">{identity.name || identity.email}</span>
                <span className="block truncate text-xs font-normal text-muted-foreground">
                  {identity.email}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {MENU.map((item) => (
                <DropdownMenuItem key={item.href} asChild>
                  <Link href={item.href} className="flex items-center gap-2">
                    <item.icon className="size-4" />
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => signOut({ callbackUrl: "/login" })}
                className="text-destructive"
              >
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

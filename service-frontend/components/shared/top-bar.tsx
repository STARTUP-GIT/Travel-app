"use client";

import { LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Logo } from "@/components/shared/logo";
import { PRIMARY_NAV } from "@/components/shared/primary-nav";
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
import { signOutProvider } from "@/features/provider/api/provider.actions";
import { providerMeta } from "@/features/provider/config";
import type { ProviderKind } from "@/features/provider/types";

export type TopBarIdentity = {
  kind: ProviderKind;
  name: string;
  email: string;
  image: string | null;
  pendingRequests: number;
};

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

              {/*
                Primary navigation, desktop only. There is no sidebar in this
                app, so on wide screens this menu *is* the navigation; on a
                phone the bottom bar already offers these four routes and
                repeating them here is what made the mobile menu feel cluttered.
              */}
              <div className="hidden lg:block">
                <DropdownMenuSeparator />
                {PRIMARY_NAV.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href} className="flex cursor-pointer items-center gap-2">
                      <item.icon className="size-4" />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </div>

              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex cursor-pointer items-center gap-2">
                  <Settings className="size-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={async () => {
                  await signOutProvider();
                  toast.success("Signed out.");
                  // A full navigation, because the session cookie is gone and the
                  // server components have to re-render without it.
                  window.location.assign("/login");
                }}
                className="cursor-pointer text-destructive"
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

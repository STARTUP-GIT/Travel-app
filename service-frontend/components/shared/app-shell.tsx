"use client";

import { usePathname } from "next/navigation";
import * as React from "react";

import { BottomNavigation } from "@/components/shared/bottom-navigation";
import { TopBar, type TopBarIdentity } from "@/components/shared/top-bar";

/**
 * Chrome for every signed-in provider screen. The route change animation uses
 * the `animate-fade-in-up` utility that already exists in globals.css, so no
 * animation library is needed.
 */
export function AppShell({
  identity,
  children,
}: {
  identity: TopBarIdentity;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar identity={identity} />

      {/*
        The bottom bar is `position: fixed`, so it does not reserve any space of
        its own. This padding is what keeps the last card — and the "All caught
        up" / "No requests yet" empty states — scrollable clear of it. It is a
        touch larger than the bar itself, plus the safe-area inset.
      */}
      <main
        key={pathname}
        className="animate-fade-in-up flex-1 pb-[calc(env(safe-area-inset-bottom)+5rem)] lg:pb-12"
      >
        {children}
      </main>

      <BottomNavigation pending={identity.pendingRequests} />
    </div>
  );
}

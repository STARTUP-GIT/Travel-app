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

      <main
        key={pathname}
        className="animate-fade-in-up flex-1 pb-[calc(env(safe-area-inset-bottom)+4.75rem)] lg:pb-12"
      >
        {children}
      </main>

      <BottomNavigation pending={identity.pendingRequests} />
    </div>
  );
}

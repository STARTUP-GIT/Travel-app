"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import * as React from "react";

import { TopBar } from "@/components/shared/top-bar";
import { BottomNavigation } from "@/components/shared/bottom-navigation";
import { Splash } from "@/components/shared/splash";
import { useDistrictShell } from "@/features/locations/hooks/useDistrictShell";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isDistrictApp } = useDistrictShell();
  const [splash, setSplash] = React.useState(true);

  React.useEffect(() => {
    const t = window.setTimeout(() => setSplash(false), 1600);
    return () => window.clearTimeout(t);
  }, []);

  const isFullViewport = pathname === "/" || pathname === "/destination";

  return (
    <div className="flex min-h-dvh flex-col">
      <Splash show={splash} />
      <TopBar />

      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "flex-1",
            // The bottom navigation only exists in the district application, so
            // only the district application reserves room for it. The global
            // landing and the destination-selection flow must not carry that
            // empty gap.
            isDistrictApp
              ? "pb-[calc(env(safe-area-inset-bottom)+4.75rem)] lg:pb-12"
              : isFullViewport
                ? "pb-[calc(env(safe-area-inset-bottom)+3.5rem)] lg:pb-0"
                : "pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"
          )}
        >
          {children}
        </motion.main>
      </AnimatePresence>

      <BottomNavigation />
    </div>
  );
}
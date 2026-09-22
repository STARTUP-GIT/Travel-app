"use client";

import { motion, AnimatePresence } from "motion/react";
import * as React from "react";

import { LogoMark } from "@/components/shared/logo";
import { useBranding } from "@/features/app-config/state/app-config-provider";

const SPLASH_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1587474260584-136574528ed5?q=80&w=1600&auto=format&fit=crop";

/**
 * Full-screen branded splash shown once on first app open. It is a real
 * application splash (hero destination imagery + animated mark + tagline),
 * not a Next.js loading screen. Name, tagline, icon and hero imagery all come
 * from the admin-controlled application configuration.
 */
export function Splash({ show }: { show: boolean }) {
  const { appName, tagline, config, bannerImages } = useBranding();
  const icon = config.icon;

  const heroImage = (bannerImages ?? []).filter(Boolean)[0] ?? SPLASH_FALLBACK_IMAGE;

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[100]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.55, ease: "easeInOut" } }}
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `linear-gradient(180deg, rgb(17 45 110 / 0.45) 0%, rgb(10 25 70 / 0.82) 78%), url(${heroImage})`,
            }}
            aria-hidden
          />
          <div className="absolute inset-x-0 inset-y-0 flex flex-col items-center justify-center gap-8 px-8 text-center">
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex size-24 items-center justify-center overflow-hidden rounded-[1.75rem] bg-white/12 shadow-2xl ring-1 ring-white/30 backdrop-blur-xl">
                {icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={icon} alt="" className="size-16 object-contain" />
                ) : (
                  <LogoMark className="size-16 shadow-none" />
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.6, ease: "easeOut" }}
              className="flex flex-col items-center gap-2"
            >
              <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-sm">
                {appName}
              </h1>
              <p className="text-sm font-medium tracking-[0.18em] text-amber-200/95 uppercase">
                {tagline}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55, duration: 0.5 }}
              className="flex items-center gap-2"
              aria-label="Loading"
            >
              <span className="size-2.5 animate-pulse rounded-full bg-white/85" />
              <span
                className="size-2.5 animate-pulse rounded-full bg-white/60"
                style={{ animationDelay: "0.18s" }}
              />
              <span
                className="size-2.5 animate-pulse rounded-full bg-white/40"
                style={{ animationDelay: "0.36s" }}
              />
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
"use client";

import { FilePen, MapPinned, Smartphone } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { IndiaSlideshow } from "@/components/shared/india-slideshow";
import { Button } from "@/components/ui/button";
import { useBranding } from "@/features/app-config/state/app-config-provider";

const DESTINATION_HINTS = [
  "Mysuru Palace",
  "Hampi",
  "Jog Falls",
  "Coorg",
  "Gokarna",
  "Kerala",
  "Goa",
  "Taj Mahal",
];

const FALLBACK_INTRO =
  "Discover heritage, nature, culture and unforgettable destinations across India — then book guides, stays and experiences.";

/**
 * Full-screen tourism landing hero for ATLASWANDERS.
 * Uses published Client App branding from Admin:
 * - 3-Line Centered Heading: WELCOME / TO / {publishedBrandName}
 * - Centered Tagline & Supporting Description
 * - Dedicated Dark Overlay (45-55% opacity) to subdue background photography for maximum text readability
 * - Centered CHOOSE DESTINATION action button & quick destination links
 */
export default function HomePage() {
  const router = useRouter();
  const { appName, brandName, tagline, config, heroImageUrl } = useBranding();

  const displayBrandName = (appName || brandName || "ATLASWANDERS").trim();
  const displayTagline = (tagline || config.text || "Discover Places. Experience Local.").trim();
  const intro = (config.app_description || FALLBACK_INTRO).trim();

  return (
    <section
      aria-label={`Tourism landing for ${displayBrandName}`}
      className="relative -mx-4 flex h-[calc(100dvh-3.5rem)] min-h-[540px] flex-col justify-between overflow-hidden px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-2 text-white sm:mx-0 sm:h-[calc(100dvh-3.5rem)] sm:min-h-[600px] sm:px-6 sm:pb-4 sm:pt-4 lg:h-[calc(100dvh-4rem)] lg:min-h-[640px]"
    >
      {/* 1. Background photography layer (slideshow with admin banner fallback) */}
      <IndiaSlideshow
        className="absolute inset-0"
        overlayClassName="bg-transparent"
        heroImage={heroImageUrl}
      />

      {/* 2. Dedicated dark navy / black overlay (45-55% visual attenuation with subtle vertical gradient) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] bg-black/45 bg-gradient-to-b from-[#0B2545]/75 via-black/55 to-[#0B2545]/85 backdrop-contrast-[1.05]"
      />

      {/* Top spacer to vertically balance the footer and guarantee perfect vertical center */}
      <div className="relative z-10 h-6 shrink-0 sm:h-8" aria-hidden="true" />

      {/* 3. Hero content layer — Centered horizontally & vertically */}
      <div className="home-hero-inner relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center justify-center text-center my-auto px-2">
        {/* Eyebrow / Tagline */}
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-amber-200 sm:text-xs md:text-sm drop-shadow-sm">
          {displayTagline}
        </p>

        {/* 3-Line Heading: Exactly WELCOME / TO / {displayBrandName} */}
        <h1 className="mt-2.5 sm:mt-3.5 flex flex-col items-center justify-center font-black tracking-tight leading-none select-none">
          <span className="text-base font-extrabold uppercase tracking-[0.28em] text-white/95 sm:text-2xl md:text-3xl lg:text-4xl drop-shadow-sm">
            WELCOME
          </span>
          <span className="my-1 sm:my-1.5 text-xs font-bold uppercase tracking-[0.38em] text-amber-300 sm:text-base md:text-lg drop-shadow-sm">
            TO
          </span>
          <span className="max-w-4xl text-3xl font-black uppercase tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.85)] sm:text-5xl md:text-6xl lg:text-7xl break-normal">
            {displayBrandName}
          </span>
        </h1>

        {/* Supporting Description */}
        <p className="mx-auto mt-3.5 max-w-xl text-xs sm:text-sm md:text-base leading-relaxed text-white/90 drop-shadow-xs px-2 sm:mt-4">
          {intro}
        </p>

        {/* CTA Destination Button & Quick Destination Links */}
        <div className="mt-6 flex w-full flex-col items-center gap-3 sm:mt-7 sm:gap-4">
          <Button
            variant="action"
            size="lg"
            className="w-full max-w-xs rounded-2xl text-sm font-bold shadow-xl shadow-black/35 sm:max-w-sm sm:text-base transition-all hover:scale-[1.02] active:scale-[0.99] cursor-pointer"
            onClick={() => router.push("/explore")}
          >
            <MapPinned className="size-4 sm:size-5" />
            CHOOSE DESTINATION
          </Button>

          <div
            aria-label="Popular destinations"
            className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 text-[0.7rem] font-medium text-white/80 sm:text-xs"
          >
            {DESTINATION_HINTS.map((name, i) => (
              <span key={name} className="inline-flex items-center gap-2">
                {i > 0 && <span className="text-white/40">•</span>}
                <button
                  type="button"
                  onClick={() => router.push(`/explore?q=${encodeURIComponent(name)}`)}
                  className="transition-colors hover:text-white underline-offset-2 hover:underline cursor-pointer"
                >
                  {name}
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Footer navigation links */}
      <footer className="relative z-10 flex shrink-0 items-center justify-center gap-4 text-[0.7rem] font-medium text-white/80 sm:gap-6 sm:text-xs pb-1 sm:pb-2">
        <Link
          href="/about"
          className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
        >
          <Smartphone className="size-3.5" />
          About App
        </Link>
        <span aria-hidden className="size-1 rounded-full bg-white/40" />
        <Link
          href="/report"
          className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
        >
          <FilePen className="size-3.5" />
          Report Issue
        </Link>
      </footer>
    </section>
  );
}
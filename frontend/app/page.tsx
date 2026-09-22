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
 * Full-screen tourism landing hero. A common India destination slideshow fills the
 * viewport beneath the top header; the primary action is CHOOSE DESTINATION,
 * which opens the separate destination-selection screen.
 */
export default function HomePage() {
  const router = useRouter();
  const { appName, tagline, config } = useBranding();

  const intro = config.app_description || FALLBACK_INTRO;

  return (
    <section
      aria-label={`Tourism landing for ${appName}`}
      className="relative -mx-4 flex h-[calc(100dvh-7rem-env(safe-area-inset-bottom,0px))] min-h-[500px] flex-col overflow-hidden px-4 pb-4 pt-2 text-white sm:mx-0 sm:h-[calc(100dvh-3.5rem)] sm:min-h-[560px] sm:px-6 sm:pb-6 sm:pt-4 lg:h-[calc(100dvh-4rem)] lg:min-h-[600px]"
    >
      <IndiaSlideshow overlayClassName="bg-gradient-to-b from-black/35 via-black/10 to-black/80" />

      <div className="home-hero-inner relative z-10 flex flex-1 flex-col justify-between py-2 sm:py-4">
        <div className="my-auto flex flex-col items-center justify-center text-center">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-amber-200 sm:text-xs">
            {tagline || "Explore • Experience • Belong"}
          </p>
          <h1 className="mt-1.5 max-w-2xl text-2xl font-bold leading-tight tracking-tight sm:mt-3 sm:text-5xl lg:text-6xl">
            Welcome to {appName}
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-white/90 sm:mt-3 sm:text-base">
            {intro}
          </p>

          <div className="mt-5 flex w-full flex-col items-center gap-3 sm:mt-7 sm:gap-4">
            <Button
              variant="action"
              size="lg"
              className="w-full max-w-xs rounded-2xl text-sm sm:max-w-sm sm:text-base"
              onClick={() => router.push("/destination")}
            >
              <MapPinned className="size-4 sm:size-5" />
              CHOOSE DESTINATION
            </Button>

            <div
              aria-hidden
              className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 px-2 text-[0.68rem] font-medium text-white/70 sm:text-xs"
            >
              {DESTINATION_HINTS.map((name, i) => (
                <span key={name} className="inline-flex items-center gap-1.5">
                  {i > 0 ? (
                    <span className="text-white/40">•</span>
                  ) : null}
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>

        <footer className="mt-4 flex items-center justify-center gap-4 text-[0.7rem] font-medium text-white/80 sm:mt-6 sm:gap-6 sm:text-xs">
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
      </div>
    </section>
  );
}
"use client";

import { FilePen, MapPinned, Smartphone } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { IndiaSlideshow } from "@/components/shared/india-slideshow";
import { DistrictSearchForm } from "@/components/shared/district-search-form";
import { Button } from "@/components/ui/button";
import type { LandingSlide } from "@/features/app-config/fallback-gallery";
import { useBranding } from "@/features/app-config/state/app-config-provider";

type DistrictHeroProps = {
  stateName: string;
  stateSlug: string;
  districtName: string;
  districtSlug: string;
  stateImage?: string | null;
  placeCount: number;
  hotelCount: number;
  restaurantCount: number;
};

export function DistrictHero({
  stateName,
  stateSlug,
  districtName,
  districtSlug,
  stateImage,
  placeCount,
  hotelCount,
  restaurantCount,
}: DistrictHeroProps) {
  const router = useRouter();
  const { tagline } = useBranding();
  const slides = React.useMemo<LandingSlide[]>(
    () => (stateImage ? [{ src: stateImage, alt: "" }] : []),
    [stateImage]
  );

  return (
    <section
      aria-label={`Tourism landing for ${districtName}`}
      className="relative -mx-4 flex h-[calc(100dvh-7rem-env(safe-area-inset-bottom,0px))] min-h-[500px] flex-col overflow-hidden px-4 pb-4 pt-2 text-white sm:mx-0 sm:h-[calc(100dvh-3.5rem)] sm:min-h-[560px] sm:px-6 sm:pb-6 sm:pt-4 lg:h-[calc(100dvh-4rem)] lg:min-h-[600px]"
    >
      <div
        className="absolute inset-0 bg-gradient-to-br from-blue-800 via-primary to-indigo-800"
        aria-hidden
      />
      <IndiaSlideshow
        slides={slides}
        overlayClassName="bg-gradient-to-b from-black/35 via-black/10 to-black/80"
      />

      <div className="home-hero-inner relative z-10 flex flex-1 flex-col justify-between py-2 sm:py-4">
        <div className="my-auto flex flex-col items-center justify-center text-center">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-amber-200 sm:text-xs">
            {tagline || "Explore • Experience • Belong"}
          </p>
          <h1 className="mt-1.5 max-w-2xl text-2xl font-bold leading-tight tracking-tight sm:mt-3 sm:text-5xl lg:text-6xl">
            Welcome to {districtName}
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-white/90 sm:mt-3 sm:text-base">
            {stateName} · Discover {placeCount} approved places, {hotelCount} approved stays and {restaurantCount} approved restaurants in {districtName}.
          </p>

          <div className="mt-5 flex w-full max-w-sm flex-col items-center gap-3 sm:mt-7 sm:gap-4">
            <div className="w-full">
              <DistrictSearchForm
                stateSlug={stateSlug}
                districtSlug={districtSlug}
              />
            </div>
            <Button
              variant="action"
              size="lg"
              className="w-full max-w-xs rounded-2xl text-sm sm:max-w-sm sm:text-base"
              onClick={() => router.push("/explore")}
            >
              <MapPinned className="size-4 sm:size-5" />
              CHOOSE DESTINATION
            </Button>

            <div
              aria-hidden
              className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 px-2 text-[0.68rem] font-medium text-white/70 sm:text-xs"
            >
              <span>{placeCount} places</span>
              <span className="text-white/40">•</span>
              <span>{hotelCount} hotels</span>
              <span className="text-white/40">•</span>
              <span>{restaurantCount} restaurants</span>
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
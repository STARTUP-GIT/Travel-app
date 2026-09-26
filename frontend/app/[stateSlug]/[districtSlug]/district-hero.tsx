"use client";

import { MapPinned } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { IndiaSlideshow } from "@/components/shared/india-slideshow";
import { DistrictSearchForm } from "@/components/shared/district-search-form";
import type { LandingSlide } from "@/features/app-config/fallback-gallery";
import { useBranding } from "@/features/app-config/state/app-config-provider";

type DistrictHeroProps = {
  stateName: string;
  stateSlug: string;
  districtName: string;
  districtSlug: string;
  stateImage?: string | null;
  description?: string;
};

export function DistrictHero({
  stateName,
  stateSlug,
  districtName,
  districtSlug,
  stateImage,
  description,
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
      className="relative mx-auto h-[11.75rem] w-full max-w-5xl overflow-hidden rounded-2xl text-white shadow-card sm:h-48 lg:h-[11.75rem]"
    >
      <IndiaSlideshow
        slides={slides}
        overlayClassName="bg-gradient-to-b from-black/35 via-black/10 to-black/80"
      />

      <div className="relative z-10 flex h-full flex-col justify-between px-4 py-3 sm:px-6 sm:py-4">
        <div className="max-w-2xl">
          <p className="text-[0.55rem] font-semibold uppercase tracking-[0.22em] text-amber-200 sm:text-[0.65rem]">
            {tagline || "Explore • Experience • Belong"}
          </p>
          <h1 className="mt-1 text-xl font-bold leading-tight tracking-tight sm:text-2xl">
            Welcome to {districtName}
          </h1>
          <p className="mt-1 max-w-xl text-[0.62rem] leading-relaxed text-white/90 sm:text-xs">
            {description || `Discover the heritage, culture and experiences of ${districtName}, ${stateName}.`}
          </p>
        </div>

        <div className="flex max-w-3xl flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <DistrictSearchForm stateSlug={stateSlug} districtSlug={districtSlug} />
          <button
            type="button"
            className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full bg-emerald-500 px-4 text-[0.65rem] font-bold text-white shadow-md transition-colors hover:bg-emerald-400 sm:h-9"
            onClick={() => router.push("/explore")}
          >
            <MapPinned className="size-3.5" />
            CHOOSE DESTINATION
          </button>
        </div>
      </div>
    </section>
  );
}
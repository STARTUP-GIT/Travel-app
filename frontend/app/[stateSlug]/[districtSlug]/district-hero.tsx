"use client";

import { MapPinned } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { IndiaSlideshow } from "@/components/shared/india-slideshow";
import { DistrictSearchForm } from "@/components/shared/district-search-form";
import { Button } from "@/components/ui/button";
import type { LandingSlide } from "@/features/app-config/fallback-gallery";
import { useBranding } from "@/features/app-config/state/app-config-provider";
import { useCurrentDistrict } from "@/features/locations/state/current-district-provider";

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
  const { clearDestination } = useCurrentDistrict();
  const slides = React.useMemo<LandingSlide[]>(
    () => (stateImage ? [{ src: stateImage, alt: "" }] : []),
    [stateImage]
  );

  /**
   * Changing destination drops the current selection first, so the old district
   * stops being the active context and the district shell disappears while the
   * visitor picks a new state and district. Nothing from this district is
   * rendered behind the selection flow.
   */
  function changeDestination() {
    clearDestination();
    router.push("/explore");
  }

  return (
    <section
      aria-label={`Tourism landing for ${districtName}`}
      className="relative mx-auto mt-3 min-h-[17rem] w-full max-w-5xl overflow-hidden rounded-3xl border border-white/15 text-white shadow-xl sm:mt-4 sm:min-h-[16rem]"
    >
      <IndiaSlideshow
        slides={slides}
        overlayClassName="bg-gradient-to-r from-black/75 via-black/45 to-black/10"
      />

      <div className="relative z-10 flex min-h-[17rem] flex-col items-start px-6 py-7 pb-14 sm:min-h-[16rem] sm:px-8 sm:py-8 sm:pb-14 md:px-10 md:py-9">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-200">
            {tagline || "Explore • Experience • Belong"}
          </p>
          <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
            Welcome to {districtName}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/90 sm:text-base">
            {description || `Discover the heritage, culture and experiences of ${districtName}, ${stateName}.`}
          </p>
        </div>

        <div className="mt-6 flex w-full max-w-2xl flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <DistrictSearchForm stateSlug={stateSlug} districtSlug={districtSlug} />
          <Button
            type="button"
            variant="action"
            size="default"
            className="h-10 shrink-0 rounded-xl bg-emerald-600 px-4 text-sm font-semibold shadow-sm hover:bg-emerald-700"
            onClick={changeDestination}
          >
            <MapPinned className="size-4" />
            Change destination
          </Button>
        </div>
      </div>
    </section>
  );
}
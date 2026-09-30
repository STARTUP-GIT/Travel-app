import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ScreenHeader } from "@/components/shared/screen-header";
import { GuidesList } from "@/features/guides/ui/guides-list";
import { listDistrictGuideDirectory } from "@/features/guides/api/guides.api";
import { resolveStateDistrict, tryStateDistrict } from "@/features/locations/server";

import type { GuideWithContext, PackageWithContext } from "@/features/guides/types";
import { DistrictUnavailable } from "@/components/shared/district-unavailable";

type RouteParams = { stateSlug: string; districtSlug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { stateSlug, districtSlug } = await params;
  const resolved = await tryStateDistrict(stateSlug, districtSlug);
  if (!resolved) return { title: "Local Guides" };
  const { state, district } = resolved;
  return {
    title: `Local Guides in ${district.name}`,
    description: `Book vetted specific and common guides in ${district.name}, ${state.name}.`,
  };
}

export default async function GuidesPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { stateSlug, districtSlug } = await params;
  const resolution = await resolveStateDistrict(stateSlug, districtSlug);
  if (resolution.status === "error") {
    return <DistrictUnavailable message={resolution.message} />;
  }
  if (resolution.status === "missing") notFound();
  const { state, district } = resolution;

  let guides: GuideWithContext[] = [];
  let packages: PackageWithContext[] = [];
  try {
    // One pass produces both: guides and tour packages are aggregated from the
    // same place detail responses, so the district is not walked twice.
    const directory = await listDistrictGuideDirectory(district.id);
    guides = directory.guides;
    packages = directory.packages;
  } catch {
    guides = [];
    packages = [];
  }

  return (
    <div className="pb-6">
      <ScreenHeader
        title="Local Guides"
        subtitle={`${district.name} district · ${guides.length} guide${guides.length === 1 ? "" : "s"}${packages.length > 0 ? ` · ${packages.length} tour${packages.length === 1 ? "" : "s"}` : ""}`}
        backHref={`/${state.slug}/${district.slug}`}
      />
      <div className="app-container">
        <Suspense>
          <GuidesList
            guides={guides}
            packages={packages}
            districtSlug={district.slug}
            stateSlug={state.slug}
          />
        </Suspense>
      </div>
    </div>
  );
}

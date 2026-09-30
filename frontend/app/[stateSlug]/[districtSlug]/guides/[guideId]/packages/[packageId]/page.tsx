import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PackageDetail } from "@/features/guides/ui/package-detail";
import { findPackageInDistrict } from "@/features/guides/api/guides.api";
import { resolveStateDistrict, tryStateDistrict } from "@/features/locations/server";
import { DistrictUnavailable } from "@/components/shared/district-unavailable";

type RouteParams = {
  stateSlug: string;
  districtSlug: string;
  guideId: string;
  packageId: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { stateSlug, districtSlug, guideId, packageId } = await params;
  const resolved = await tryStateDistrict(stateSlug, districtSlug);
  if (!resolved) return { title: "Tour" };
  const { district } = resolved;
  try {
    const pkg = await findPackageInDistrict(district.id, guideId, packageId);
    if (!pkg) return { title: "Tour" };
    return {
      title: `${pkg.name} in ${district.name}`,
      description:
        pkg.description ??
        `Book the ${pkg.name} tour with ${pkg.guide.full_name} in ${district.name}.`,
    };
  } catch {
    return { title: "Tour" };
  }
}

export default async function PackagePage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { stateSlug, districtSlug, guideId, packageId } = await params;
  const resolution = await resolveStateDistrict(stateSlug, districtSlug);
  if (resolution.status === "error") {
    return <DistrictUnavailable message={resolution.message} />;
  }
  if (resolution.status === "missing") notFound();
  const { state, district } = resolution;

  // Scoped to the guide in the URL as well as the package, so a package id from
  // another guide cannot be opened through this route.
  const pkg = await findPackageInDistrict(district.id, guideId, packageId).catch(
    () => null
  );
  if (!pkg) notFound();

  return (
    <PackageDetail
      pkg={pkg}
      districtSlug={district.slug}
      stateSlug={state.slug}
      districtId={district.id}
    />
  );
}

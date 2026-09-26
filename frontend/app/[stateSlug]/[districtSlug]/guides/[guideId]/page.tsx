import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GuideProfile } from "@/features/guides/ui/guide-profile";
import { listGuidesForDistrict } from "@/features/guides/api/guides.api";
import { resolveStateDistrict, tryStateDistrict } from "@/features/locations/server";
import { DistrictUnavailable } from "@/components/shared/district-unavailable";

type RouteParams = { stateSlug: string; districtSlug: string; guideId: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { stateSlug, districtSlug, guideId } = await params;
  const resolved = await tryStateDistrict(stateSlug, districtSlug);
  if (!resolved) return { title: "Guide" };
  const { district } = resolved;
  try {
    const guide = await listGuidesForDistrict(district.id).then((gs) =>
      gs.find((g) => g.guide.id === guideId)
    );
    if (!guide) return { title: "Guide" };
    return {
      title: `${guide.guide.full_name} · Guide in ${district.name}`,
      description:
        guide.guide.tagline ??
        `Book ${guide.guide.full_name}, a local guide in ${district.name}.`,
    };
  } catch {
    return { title: "Guide" };
  }
}

export default async function GuideProfilePage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { stateSlug, districtSlug, guideId } = await params;
  const resolution = await resolveStateDistrict(stateSlug, districtSlug);
  if (resolution.status === "error") {
    return <DistrictUnavailable message={resolution.message} />;
  }
  if (resolution.status === "missing") notFound();
  const { state, district } = resolution;

  const guides = await listGuidesForDistrict(district.id).catch(() => []);
  const guide = guides.find((g) => g.guide.id === guideId);
  if (!guide) notFound();

  return (
    <GuideProfile
      guide={guide}
      districtSlug={district.slug}
      stateSlug={state.slug}
      districtId={district.id}
    />
  );
}

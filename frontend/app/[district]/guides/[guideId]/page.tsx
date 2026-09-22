import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GuideProfile } from "@/features/guides/ui/guide-profile";
import { listGuidesForDistrict } from "@/features/guides/api/guides.api";
import { requireDistrict } from "@/features/locations/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ district: string; guideId: string }>;
}): Promise<Metadata> {
  const { district: slug, guideId } = await params;
  try {
    const district = await requireDistrict(slug);
    const guide = await listGuidesForDistrict(district.id).then((gs) =>
      gs.find((g) => g.guide.id === guideId)
    );
    if (!guide) return { title: "Guide" };
    return {
      title: `${guide.guide.full_name} · Guide in ${district.name}`,
      description: guide.guide.tagline ?? `Book ${guide.guide.full_name}, a local guide in ${district.name}.`,
    };
  } catch {
    return { title: "Guide" };
  }
}

export default async function GuideProfilePage({
  params,
}: {
  params: Promise<{ district: string; guideId: string }>;
}) {
  const { district: slug, guideId } = await params;
  const district = await requireDistrict(slug);

  const guides = await listGuidesForDistrict(district.id).catch(() => []);
  const guide = guides.find((g) => g.guide.id === guideId);
  if (!guide) notFound();

  return (
    <GuideProfile guide={guide} districtSlug={slug} districtId={district.id} />
  );
}
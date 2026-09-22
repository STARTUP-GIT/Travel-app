import type { Metadata } from "next";
import { Suspense } from "react";

import { ScreenHeader } from "@/components/shared/screen-header";
import { GuidesList } from "@/features/guides/ui/guides-list";
import { listGuidesForDistrict } from "@/features/guides/api/guides.api";
import { requireDistrict } from "@/features/locations/server";

import type { GuideWithContext } from "@/features/guides/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ district: string }>;
}): Promise<Metadata> {
  const { district: slug } = await params;
  try {
    const district = await requireDistrict(slug);
    return {
      title: `Local Guides in ${district.name}`,
      description: `Book vetted specific and common guides in ${district.name}, Karnataka.`,
    };
  } catch {
    return { title: "Local Guides" };
  }
}

export default async function GuidesPage({
  params,
}: {
  params: Promise<{ district: string }>;
}) {
  const { district: slug } = await params;
  const district = await requireDistrict(slug);

  let guides: GuideWithContext[] = [];
  try {
    guides = await listGuidesForDistrict(district.id);
  } catch {
    guides = [];
  }

  return (
    <div className="pb-6">
      <ScreenHeader
        title="Local Guides"
        subtitle={`${district.name} district · ${guides.length} guide${guides.length === 1 ? "" : "s"}`}
        backHref={`/${slug}`}
      />
      <div className="app-container">
        <Suspense>
          <GuidesList guides={guides} districtSlug={slug} />
        </Suspense>
      </div>
    </div>
  );
}
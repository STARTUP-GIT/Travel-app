import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ScreenHeader } from "@/components/shared/screen-header";
import { StateDistrictsView } from "./state-view";
import { getDistrictsForState, getStateBySlug } from "@/features/locations/api/locations.api";
import type { DistrictSummary, StateSummary } from "@/features/locations/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ stateSlug: string }>;
}): Promise<Metadata> {
  const { stateSlug } = await params;
  const state = await getStateBySlug(stateSlug).catch(() => null);
  return {
    title: state ? `Choose District · ${state.name}` : "Choose District",
    description: `Choose a district in ${state?.name ?? "the selected state"} to explore its places.`,
  };
}

export default async function StateDistrictsPage({
  params,
}: {
  params: Promise<{ stateSlug: string }>;
}) {
  const { stateSlug } = await params;
  const state: StateSummary | null = await getStateBySlug(stateSlug).catch(() => null);
  if (!state) notFound();

  const districts: DistrictSummary[] = await getDistrictsForState(stateSlug).catch(
    () => []
  );

  return (
    <div className="pb-6">
      <ScreenHeader
        title={state.name}
        subtitle={`${districts.length} districts in ${state.name}`}
        backHref="/explore"
      />
      <div className="app-container">
        <StateDistrictsView state={state} districts={districts} />
      </div>
    </div>
  );
}
import type { Metadata } from "next";

import { ScreenHeader } from "@/components/shared/screen-header";
import { ExploreView } from "./explore-view";
import { getStates } from "@/features/locations/api/locations.api";
import type { StateSummary } from "@/features/locations/types";

export const metadata: Metadata = {
  title: "Choose State",
  description: "Pick a state to start exploring its districts, places, guides, hotels and restaurants.",
};

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const states: StateSummary[] = await getStates().catch(() => []);
  return (
    <div className="pb-6">
      <ScreenHeader
        title="Choose State"
        subtitle={`${states.length} states ready to explore`}
      />
      <div className="app-container">
        <ExploreView states={states} />
      </div>
    </div>
  );
}
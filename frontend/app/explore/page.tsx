import type { Metadata } from "next";

import { ScreenHeader } from "@/components/shared/screen-header";
import { loadDestinationStates } from "@/features/locations/api/destination.api";
import { ExploreView } from "./explore-view";

export const metadata: Metadata = {
  title: "Choose Destination",
  description:
    "Pick a state, then a district, to explore places, hotels, restaurants and local guides.",
};

/**
 * Always server-rendered so both the enabled-state and enabled-district lists
 * are real backend data on every request. `loadDestinationStates` never
 * rejects, so a backend outage renders the in-app error state instead of a
 * 500.
 */
export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const { states, districts, loadError } = await loadDestinationStates();

  return (
    <div className="pb-6">
      <ScreenHeader
        title="Choose Destination"
        subtitle="Pick a state, then a district"
        backHref="/"
      />
      <div className="app-container pt-3 sm:pt-5">
        <ExploreView states={states} districts={districts} loadError={loadError} />
      </div>
    </div>
  );
}

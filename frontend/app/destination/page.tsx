import type { Metadata } from "next";

import { ScreenHeader } from "@/components/shared/screen-header";
import { DestinationView } from "./destination-view";

export const metadata: Metadata = {
  title: "Choose Destination",
  description:
    "Select a state or a district to start exploring places, guides, hotels and restaurants.",
};

export default function DestinationPage() {
  return (
    <div className="pb-3 sm:pb-6">
      <ScreenHeader
        title="Choose Destination"
        subtitle="Where do you want to explore?"
        backHref="/"
      />
      <div className="app-container pt-3 sm:pt-5">
        <DestinationView />
      </div>
    </div>
  );
}
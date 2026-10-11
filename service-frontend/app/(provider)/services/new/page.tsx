import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BackLink } from "@/components/shared/screen-header";
import { PageHeader } from "@/components/shared/page-header";
import { HotelForm } from "@/features/provider/components/hotel-form";
import { RestaurantForm } from "@/features/provider/components/restaurant-form";
import { getStates } from "@/features/locations/api/locations.api";
import { requireProviderSession } from "@/features/provider/state/provider-session";

export const metadata: Metadata = { title: "Add a listing" };

export default async function NewServicePage() {
  const session = await requireProviderSession("/services/new");

  // Guides have no listing to create: their listing is their profile.
  if (session.kind === "common_guide" || session.kind === "specific_guide") {
    redirect("/services");
  }

  const states = await getStates().catch(() => []);

  if (session.kind === "hotel") {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <BackLink href="/services" />
        <PageHeader
          title="Add a hotel"
          description="Everything here is shown to travellers once the platform approves the listing."
        />
        <div className="mt-6">
          <HotelForm
            submitLabel="Submit for review"
            initialStates={states}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <BackLink href="/services" />
      <PageHeader
        title="Add a restaurant"
        description="Everything here is shown to travellers once the platform approves the listing."
      />
      <div className="mt-6">
        <RestaurantForm
          submitLabel="Submit for review"
          initialStates={states}
        />
      </div>
    </div>
  );
}


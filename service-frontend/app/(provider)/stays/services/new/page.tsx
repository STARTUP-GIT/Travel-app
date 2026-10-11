import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BackLink } from "@/components/shared/screen-header";
import { PageHeader } from "@/components/shared/page-header";
import { StayForm } from "@/features/provider/components/stay-form";
import { getStates } from "@/features/locations/api/locations.api";
import { requireProviderSession } from "@/features/provider/state/provider-session";

export const metadata: Metadata = { title: "Add a Stay or Hostel" };

export default async function NewStayPage() {
  const session = await requireProviderSession("/stays/services/new");

  // Only accommodation owners can manage stays
  if (session.kind !== "hotel") {
    redirect("/services");
  }

  const states = await getStates().catch(() => []);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <BackLink href="/stays/services" />
      <PageHeader
        title="Add a Stay or Hostel"
        description="Configure dorm beds, private rooms, community facilities, house rules, and social experiences. Everything here is shown to travellers once approved."
      />
      <div className="mt-6">
        <StayForm
          submitLabel="Submit stay for review"
          initialStates={states}
        />
      </div>
    </div>
  );
}

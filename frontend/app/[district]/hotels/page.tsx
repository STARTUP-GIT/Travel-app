import type { Metadata } from "next";
import { Hotel } from "lucide-react";

import { ScreenHeader } from "@/components/shared/screen-header";
import { EmptyState } from "@/components/shared/states";
import { HotelCard } from "@/features/hotels/ui/hotel-card";
import { getHotelsForDistrict } from "@/features/hotels/api/hotels.api";
import { requireDistrict } from "@/features/locations/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ district: string }>;
}): Promise<Metadata> {
  const { district: slug } = await params;
  try {
    const district = await requireDistrict(slug);
    return { title: `Hotels in ${district.name}`, description: `Book stays in ${district.name}, Karnataka.` };
  } catch {
    return { title: "Hotels" };
  }
}

export default async function HotelsPage({
  params,
}: {
  params: Promise<{ district: string }>;
}) {
  const { district: slug } = await params;
  const district = await requireDistrict(slug);
  const hotels = await getHotelsForDistrict(district.id).catch(() => []);

  return (
    <div className="pb-6">
      <ScreenHeader
        title="Hotels"
        subtitle={`${district.name} district · ${hotels.length} stay${hotels.length === 1 ? "" : "s"}`}
        backHref={`/${slug}`}
      />
      <div className="app-container">
        {hotels.length === 0 ? (
          <EmptyState
            icon={Hotel}
            title="No hotels published yet"
            description={`There are no approved hotels in ${district.name} right now. Check back soon!`}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hotels.map((hotel) => (
              <HotelCard key={hotel.id} hotel={hotel} districtSlug={slug} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
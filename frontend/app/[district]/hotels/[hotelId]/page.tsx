import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { HotelView } from "@/features/hotels/ui/hotel-view";
import { getHotelById } from "@/features/hotels/api/hotels.api";
import { requireDistrict, requireDistrictResource } from "@/features/locations/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ district: string; hotelId: string }>;
}): Promise<Metadata> {
  const { district: slug, hotelId } = await params;
  try {
    const district = await requireDistrict(slug);
    const hotel = await getHotelById(district.id, hotelId);
    requireDistrictResource(hotel, district);
    return {
      title: `${hotel.name} · ${district.name}`,
      description: hotel.description?.slice(0, 160) ?? `${hotel.name} in ${district.name}, Karnataka.`,
    };
  } catch {
    return { title: "Hotel" };
  }
}

export default async function HotelPage({
  params,
}: {
  params: Promise<{ district: string; hotelId: string }>;
}) {
  const { district: slug, hotelId } = await params;
  const district = await requireDistrict(slug);
  const hotel = await getHotelById(district.id, hotelId)
    .then((h) => requireDistrictResource(h, district))
    .catch(() => notFound());

  return <HotelView hotel={hotel} districtSlug={slug} />;
}
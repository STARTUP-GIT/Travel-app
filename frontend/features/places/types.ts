import type { ContentStatus, District } from "@/features/locations/types";
import type { CommonGuide, SpecificGuide, TourPackageSummary } from "@/features/guides/types";

/**
 * One ticket band: an amount for a given age group and visitor type.
 *
 * Mirrors the backend `placeVisitorType` enum. `ageGroup` stays free text because
 * the bands a real attraction uses differ per place.
 */
export type PlacePricingBand = {
  id: string;
  visitor: "DOMESTIC" | "FOREIGN";
  ageGroup: string;
  amount: number;
};

export type Place = {
  id: string;
  name: string;
  description: string;
  districtId: string;
  images: string[];
  /**
   * The single flat price, still the source of truth for a place that charges
   * one amount (and `null` for a free place). Read from `pricing` when that is
   * non-empty, since bands replace the flat price rather than adding to it.
   */
  entryfee: number | null;
  category: string;
  /**
   * Per-band prices, when the place charges differently by age group or visitor
   * type. Empty or absent for the overwhelming majority of places, which is also
   * every place created before these bands existed — so the UI must fall back to
   * `entryfee` rather than treat an empty list as "free".
   */
  pricing?: PlacePricingBand[];
  /** Approval state; only APPROVED content is customer visible. */
  status?: ContentStatus;
  latitude: number;
  longitude: number;
  createdAt: string;
  updatedAt: string;
  district?: District;
  specificguide?: SpecificGuide[];
  commonGuidePlaces?: {
    id: string;
    placeId: string;
    commonGuideId: string;
    commonGuide?: CommonGuide;
  }[];
  /**
   * Tour packages that include this place. Absent or empty on a backend that has
   * not run the package migration, which is the same "no packages" the UI shows.
   */
  commonGuidePackages?: TourPackageSummary[];
};
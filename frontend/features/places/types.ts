import type { ContentStatus, District } from "@/features/locations/types";
import type { CommonGuide, SpecificGuide, TourPackageSummary } from "@/features/guides/types";

export type Place = {
  id: string;
  name: string;
  description: string;
  districtId: string;
  images: string[];
  entryfee: number;
  category: string;
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
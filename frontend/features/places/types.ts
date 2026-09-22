import type { District } from "@/features/locations/types";
import type { CommonGuide, SpecificGuide } from "@/features/guides/types";

export type Place = {
  id: string;
  name: string;
  description: string;
  districtId: string;
  images: string[];
  entryfee: number;
  category: string;
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
};
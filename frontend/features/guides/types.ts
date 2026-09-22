export type SpecificGuide = {
  id: string;
  full_name: string;
  username: string;
  email: string;
  phonenumber: string;
  profile_pic?: string | null;
  tagline?: string | null;
  password?: string;
  rating?: number | null;
  review: string[];
  description?: string | null;
  placeid: string;
  isReported: boolean;
  experience: number;
  cost: number;
  language: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type CommonGuide = {
  id: string;
  full_name: string;
  username: string;
  email: string;
  phonenumber: string;
  profile_pic?: string;
  tagline?: string | null;
  password?: string;
  rating?: number | null;
  review: string[];
  description?: string | null;
  isReported: boolean;
  experience: number;
  cost: number;
  language: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type GuideType = "specific" | "common";

export type CommonGuidePlaceLink = {
  id: string;
  placeId: string;
  commonGuideId: string;
};

export type GuideWithContext =
  | {
      type: "specific";
      guide: SpecificGuide;
      place: {
        id: string;
        name: string;
        slug: string;
        districtName: string;
      };
    }
  | {
      type: "common";
      guide: CommonGuide;
      places: {
        id: string;
        name: string;
        slug: string;
        districtName: string;
        images?: string[];
      }[];
    };
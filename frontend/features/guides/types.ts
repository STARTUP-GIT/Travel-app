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
  /**
   * The guide's agency, e.g. "Mysuru Heritage Tours".
   *
   * Optional because most guides are individuals: `null`/absent means the guide
   * trades in their own name, and the customer surfaces hide the agency block
   * rather than printing an empty label. The backend only ever returns what it
   * put in this list, so there is no password field to ignore.
   */
  agencyName?: string | null;
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

/**
 * A tour package as it arrives on a place detail response. `commonGuideId` is
 * carried by the backend so packages can be grouped under their guide without a
 * second lookup, and only ever appears for an approved guide.
 *
 * `placeCount` is the package's real size, which matters for a package that
 * spans districts: the places resolved for the current district can be fewer.
 */
export type TourPackageSummary = {
  id: string;
  name: string;
  description: string | null;
  commonGuideId: string;
  placeCount: number;
  createdAt: string;
  updatedAt: string;
};

/** A package resolved to the places it contains inside the current district. */
export type TourPackage = TourPackageSummary & {
  places: {
    id: string;
    name: string;
    slug: string;
    districtName: string;
    images?: string[];
  }[];
};

export type PackageWithContext = TourPackage & {
  guide: CommonGuide;
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
      /** The guide's own packages, limited to those touching this district. */
      packages: TourPackageSummary[];
    };
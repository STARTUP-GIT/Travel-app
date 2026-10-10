export type SpecificGuide = {
  id: string;
  full_name: string;
  username: string;
  email: string;
  phonenumber: string;
  phone?: string;
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
  phone?: string;
  profile_pic?: string;
  tagline?: string | null;
  agencyName?: string | null;
  agencyAddress?: string | null;
  agencyBanner?: string | null;
  agencyMapsUrl?: string | null;
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
  duration?: string | null;
  maxGroupSize?: number | null;
  packageImages?: string[];
  pricingMode?: string;
  pricingUnit?: string;
  price?: number;
  allowCustomerPlaceSelection?: boolean;
  cancellationPolicy?: string | null;
  foodStatus?: string | null;
  foodDetails?: string | null;
  mealsService?: "INCLUDED" | "ON_REQUEST" | "NO_SERVICE" | string | null;
  includedMeals?: string[];
  mealDetails?: string | null;
  transportStatus?: string | null;
  transportDetails?: string | null;
  transportService?: "INCLUDED" | "ON_REQUEST" | "NO_SERVICE" | string | null;
  transportVehicles?: {
    type: string;
    capacity: number;
    isPrivate: boolean;
    chargesIncluded?: string;
    chargesExcluded?: string;
    conditions?: string;
  }[] | null;
  entryFeeStatus?: string | null;
  entryFeeDetails?: string | null;
  additionalCostsDetails?: string | null;
  hasSpecificGuide?: boolean;
  specificGuideId?: string | null;
  specificGuide?: {
    id: string;
    name: string;
    username?: string;
    profilePic?: string | null;
    experienceYears?: number;
    pricePerDay?: number;
    languages: string[];
    specialties?: string[];
    rating?: number | null;
    tagline?: string | null;
    agencyName?: string | null;
  } | null;
  childrenAllowed?: boolean;
  childMaxAge?: number | null;
  maxChildren?: number | null;
  childrenCountTowardCapacity?: boolean;
  childPrice?: number | null;
  childConditions?: string | null;
  tripStartTime?: string | null;
  pickupName?: string | null;
  pickupAddress?: string | null;
  pickupMapsUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

/** A package resolved to the places it contains inside the current district. */
export type TourPackagePlace = {
  id: string;
  name: string;
  slug: string;
  districtName: string;
  description?: string | null;
  images?: string[];
  category?: string;
  entryfee?: number | null;
  price?: number | null;
  itineraryOrder?: number;
  visitArrangement?: "GUIDED" | "DROP_OFF" | string;
  expectedDuration?: string | null;
  entryFeeStatus?: "INCLUDED" | "EXCLUDED" | string;
  entryFeeAmount?: number | null;
  pricing?: {
    id: string;
    visitor: "DOMESTIC" | "FOREIGN";
    ageGroup: string;
    amount: number;
  }[];
};

export type TourPackage = TourPackageSummary & {
  places: TourPackagePlace[];
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
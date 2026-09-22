export type Country = {
  id: string;
  name: string;
  isServiceAvailable: boolean;
};

export type State = {
  id: string;
  name: string;
  countryId: string;
  country: Country;
  isServiceAvailable: boolean;
  /** Admin-selected primary image for this state (backend-driven). */
  primaryImage?: string | null;
};

export type StateSummary = State & {
  slug: string;
  districtCount: number;
  placeCount: number;
};

export type District = {
  id: string;
  name: string;
  stateId: string;
  state: State;
  isServiceAvailable: boolean;
};

export type DistrictSummary = District & {
  slug: string;
  placeCount: number;
  hotelCount: number;
  restaurantCount: number;
};
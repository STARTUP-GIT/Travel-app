export type TransportMode =
  | "auto"
  | "bike"
  | "car"
  | "suv";

export type TransportOption = {
  id: TransportMode;
  label: string;
  description: string;
  /** Estimated fare in INR. */
  fareEstimate: number | null;
  /** Optional flag for further transport choices. */
  seats: number;
};

export type TransportFareInput = {
  distanceMeters: number | null;
  mode: TransportMode;
};

export type TransportPlan = {
  mode: TransportMode;
  distanceMeters: number | null;
  fareEstimate: number | null;
  originLabel: string;
  destinationLabel: string;
  createdAt: string;
};
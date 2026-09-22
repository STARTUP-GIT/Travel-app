export type TripPoint = {
  lat: number;
  lng: number;
  accuracy?: number | null;
  timestamp: number;
};

export type TripDestination = {
  id: string;
  name: string;
  districtSlug: string;
};

export type SavedTrip = {
  id: string;
  destination: TripDestination;
  startedAt: string;
  endedAt: string;
  /** Cumulative distance from one recorded point to the next (meters). */
  distanceMeters: number | null;
  points: TripPoint[];
  status: "completed";
};

export type TripRecordingState = {
  points: TripPoint[];
  startedAt: string | null;
  distanceMeters: number;
};
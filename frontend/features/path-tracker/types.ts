// Core domain types for Path Tracker - aligned with original Path-Tracker

/** A raw GPS fix reported by the device/browser. */
export interface Coordinate {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

/** A recorded, validated point on the trip path. */
export interface TripPoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number | null;
  heading?: number;
  speed?: number;
  timestamp: number;
  /** Sequential index within the trip. */
  index: number;
}

/** Trip states. */
export type TripState = 'IDLE' | 'ACTIVE' | 'PAUSED' | 'RETURNING' | 'ARRIVED' | 'COMPLETED';

/** Movement state derived from multiple consecutive GPS fixes. */
export type MovementState = 'STATIONARY' | 'MOVING' | 'UNCERTAIN';

/** Arrival confirmation state machine. */
export type ArrivalState = 'NOT_NEAR' | 'CANDIDATE_ARRIVAL' | 'CONFIRMED_ARRIVAL';

/** Off-route alert states with hysteresis. */
export type OffRouteState =
  | 'ON_ROUTE'
  | 'OFF_ROUTE_WARNING'
  | 'OFF_ROUTE_CONFIRMED'
  | 'RETURNED_TO_ROUTE';

/** A persisted trip. */
export interface Trip {
  id: string;
  startTime: number;
  endTime?: number;
  totalDistance: number;
  /** Milliseconds of active (non-paused) recording. */
  activeDurationMs: number;
  points: TripPoint[];
  state: TripState;
  /** Computed when ending. */
  avgSpeed?: number;
  avgPaceSecPerKm?: number;
  maxSpeed?: number;
  /** Number of points recorded during the outbound (ACTIVE) leg. */
  outboundPointCount?: number;
  /** Whether the return completed. */
  returnedToStart?: boolean;
}

/** A lightweight summary used for the history list. */
export interface TripSummary {
  id: string;
  startTime: number;
  endTime?: number;
  totalDistance: number;
  activeDurationMs: number;
  state: TripState;
  pointCount: number;
  returnedToStart?: boolean;
}

export interface TripStats {
  distance: number;
  activeDurationMs: number;
  avgSpeed: number;
  avgPaceSecPerKm: number;
  maxSpeed: number;
  pointCount: number;
}

export interface ReturnState {
  active: boolean;
  /** Distance (m) from current position to the destination (start point). */
  distanceToStart: number;
  /** Distance (m) along the active return corridor from user to start. */
  remainingCorridorDistance: number;
  /** Bearing (degrees) from current position to the destination. */
  bearingToStart: number;
  /** Device heading (degrees). */
  heading: number;
  /** Heading data available? */
  hasHeading: boolean;
  /** Destination coordinate (the trip start). */
  destination: Coordinate | null;
  /** Estimated time to return (min) based on pace, when known. */
  estimatedMinutes: number | null;
  offRoute: OffRouteState;
  lastConfirmedAt: number;
  /** Same-path return corridor extracted from recorded path. */
  returnCorridor: Coordinate[] | null;
  /** Recovery route (polyline) connecting off-route user back to recorded corridor. */
  recoveryRoute: Coordinate[] | null;
  /** Nearest point on the recorded corridor where recovery route reconnects. */
  reconnectPoint: Coordinate | null;
  /** Route source. */
  routeSource: 'corridor' | 'recovery' | 'online' | 'offline' | 'none';
  /** Current arrival confirmation state. */
  arrivalState: ArrivalState;
  /** How many consecutive ticks have satisfied arrival candidate conditions. */
  arrivalConfirmCount: number;
}

/** Trip snapshot exposed to subscribers. */
export interface TripSnapshot {
  trip: Trip | null;
  stats: TripStats;
  state: TripState;
  currentPosition: Coordinate | null;
  acceptedPosition: Coordinate | null;
  gpsAccuracy: number;
  returnState: ReturnState;
  pointCount: number;
  movementState: MovementState;
  movementConfidence: number;
  positionSpreadM: number;
  isCalibrating: boolean;
}

// Original frontend types for compatibility
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

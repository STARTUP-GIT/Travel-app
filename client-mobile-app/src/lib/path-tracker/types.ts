// Core domain types for Path Tracker (Mobile Port, parity with Website).

/** A raw GPS fix reported by the device. */
export interface Coordinate {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp: number;
}

/** A geographic viewport. */
export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

/** A recorded, validated point on the trip path. */
export interface TripPoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
  /** Sequential index within the trip. */
  index: number;
}

/**
 * Trip states.
 * - IDLE: no active trip
 * - ACTIVE: recording, moving
 * - PAUSED: recording suspended (timer/distance frozen)
 * - RETURNING: user has engaged return-to-start guidance
 * - ARRIVED: user reached start destination (within arrival threshold)
 * - COMPLETED: ended and saved
 */
export type TripState = 'IDLE' | 'ACTIVE' | 'PAUSED' | 'RETURNING' | 'ARRIVED' | 'COMPLETED';

export type NetworkState = 'online' | 'offline' | 'unknown';

export type GPSState = 'searching' | 'available' | 'unavailable' | 'permission-denied';

/** Off-route alert states with hysteresis. */
export type OffRouteState =
  | 'ON_ROUTE'
  | 'OFF_ROUTE_WARNING'
  | 'OFF_ROUTE_CONFIRMED'
  | 'RETURNED_TO_ROUTE';

/**
 * Movement state derived from multiple consecutive GPS fixes.
 * - STATIONARY: no meaningful movement detected
 * - MOVING: consistent meaningful displacement observed
 * - UNCERTAIN: mixed signals (transitional)
 */
export type MovementState = 'STATIONARY' | 'MOVING' | 'UNCERTAIN';

/** Arrival confirmation state machine. */
export type ArrivalState = 'NOT_NEAR' | 'CANDIDATE_ARRIVAL' | 'CONFIRMED_ARRIVAL';

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
  avgSpeed?: number;
  avgPaceSecPerKm?: number;
  maxSpeed?: number;
  returnRoute?: Coordinate[];
  returnedToStart?: boolean;
  outboundPointCount?: number;
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

export interface ReturnState {
  active: boolean;
  distanceToStart: number;
  remainingCorridorDistance: number;
  bearingToStart: number;
  heading: number;
  hasHeading: boolean;
  destination: Coordinate | null;
  estimatedMinutes: number | null;
  offRoute: OffRouteState;
  lastConfirmedAt: number;
  returnCorridor: Coordinate[] | null;
  recoveryRoute: Coordinate[] | null;
  reconnectPoint: Coordinate | null;
  onlineRoute: Coordinate[] | null;
  routeSource: 'corridor' | 'recovery' | 'online' | 'offline' | 'none';
  arrivalState: ArrivalState;
  arrivalConfirmCount: number;
}

export interface TripStats {
  distance: number;
  activeDurationMs: number;
  avgSpeed: number;
  avgPaceSecPerKm: number;
  maxSpeed: number;
  pointCount: number;
}

export interface PersistResult {
  pointCount: number;
}

/** A manually saved marker during an active trip. */
export interface Checkpoint {
  checkpointId: string;
  tripId: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  checkpointNumber: number;
}

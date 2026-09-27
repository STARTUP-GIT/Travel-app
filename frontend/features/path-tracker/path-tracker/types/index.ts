// Core domain types for Path Tracker.

/** A raw GPS fix reported by the device. */
export interface Coordinate {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

/**
 * A geographic viewport (center + span deltas). Engine-agnostic so map
 * renderers (native Google Maps, web fallbacks) share one shape.
 */
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

/** Off-route alert states with hysteresis to avoid spam. */
export type OffRouteState =
  | 'ON_ROUTE'
  | 'OFF_ROUTE_WARNING'
  | 'OFF_ROUTE_CONFIRMED'
  | 'RETURNED_TO_ROUTE';

/**
 * Movement state derived from multiple consecutive GPS fixes.
 * Used to gate heading updates and camera rotation.
 * - STATIONARY: no meaningful movement detected
 * - MOVING: consistent meaningful displacement observed
 * - UNCERTAIN: mixed signals (transitional)
 */
export type MovementState = 'STATIONARY' | 'MOVING' | 'UNCERTAIN';

/**
 * Arrival confirmation state machine.
 * NOT_NEAR → CANDIDATE_ARRIVAL → CONFIRMED_ARRIVAL
 * CANDIDATE_ARRIVAL can revert to NOT_NEAR if the user moves away.
 */
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
  /** Computed when ending. */
  avgSpeed?: number;
  avgPaceSecPerKm?: number;
  maxSpeed?: number;
  /** Snapshot of the return route (online routing), if generated. */
  returnRoute?: Coordinate[];
  /** Whether the return completed. */
  returnedToStart?: boolean;
  /**
   * Number of points recorded during the outbound (ACTIVE) leg.
   * Used to isolate the outbound path for return-corridor matching
   * so that points added during the return leg don't corrupt navigation.
   */
  outboundPointCount?: number;
}

/** A lightweight summary used for the history list (no full point array). */
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
  /** Same-path return corridor extracted from recorded path (from user back to start). */
  returnCorridor: Coordinate[] | null;
  /** Recovery route (OSRM polyline) connecting off-route user back to recorded corridor. */
  recoveryRoute: Coordinate[] | null;
  /** Nearest point on the recorded corridor where recovery route reconnects. */
  reconnectPoint: Coordinate | null;
  /** Legacy online route field kept for backward compatibility. */
  onlineRoute: Coordinate[] | null;
  /** Route source: same-path corridor or recovery route. */
  routeSource: 'corridor' | 'recovery' | 'online' | 'offline' | 'none';
  /** Current arrival confirmation state. */
  arrivalState: ArrivalState;
  /** How many consecutive ticks have satisfied arrival candidate conditions. */
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

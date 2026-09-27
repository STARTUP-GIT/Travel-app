// Tracking configuration constants - aligned with original Path-Tracker

/**
 * GPS sampling: fine-grained 1m / 1000ms updates
 */
export const TrackingConfig = {
  // GPS sampling
  distanceFilterMeters: 1,
  timeIntervalMs: 1000,

  // Filtering
  minAccuracyMeters: 60,
  maxPlausibleSpeedMs: 45,
  maxJumpMeters: 250,
  duplicateThresholdMeters: 0.5,

  // Adaptive sampling for the recorded polyline
  adaptive: {
    straightMinDistance: 3,
    turnMinDistance: 1.5,
    turnAngleThresholdDeg: 25,
  },
} as const;

/**
 * Movement detection configuration.
 *
 * Uses multi-signal fusion (GPS displacement, direction consistency,
 * reported speed, position spread) to produce a confidence score.
 * Distance accumulation is gated on the resulting movement state.
 */
export const MovementConfig = {
  /** Number of recent GPS positions to analyse for random-walk detection. */
  positionHistorySize: 10,

  /** Maximum average spread of recent positions as fraction of GPS accuracy. */
  stationarySpreadFactor: 0.55,

  /** Minimum direction-consistency score (0-1) to indicate coherent movement. */
  movingDirectionThreshold: 0.55,

  /** Confidence above which we transition toward MOVING. */
  confidenceMovingThreshold: 0.50,

  /** Confidence below which we transition toward STATIONARY. */
  confidenceStationaryThreshold: 0.30,

  /** Consecutive high-confidence fixes needed to declare MOVING. */
  movingConfirmCount: 3,

  /** Consecutive low-confidence fixes needed to declare STATIONARY. */
  stationaryConfirmCount: 5,

  /** Calibration period after trip start (ms) — no distance accumulated. */
  calibrationPeriodMs: 5000,

  /** Minimum fixes collected during calibration before movement detection activates. */
  calibrationMinFixes: 5,

  /** Minimum displacement (m) between consecutive fixes to consider. */
  minDisplacementM: 1.5,

  /**
   * Displacement must exceed this fraction of reported accuracy to count
   * as evidence of movement.
   */
  minDisplacementAccuracyRatio: 0.45,
} as const;

/**
 * Off-route detection configuration.
 */
export const OffRouteConfig = {
  /** Distance from the route segment that counts as "off route". */
  thresholdMeters: 45,
  /** Hysteresis: user must be within this distance to exit off-route state. */
  exitThresholdMeters: 25,
  /** Consecutive updates in warning before it's confirmed. */
  confirmCount: 4,
  /** Cooldown between alerts for the same event. */
  alertCooldownMs: 30000,
  /** GPS accuracy above which we distrust the off-route verdict. */
  minReliableAccuracyMeters: 80,
} as const;

/**
 * Arrival state-machine configuration.
 */
export const ArrivalConfig = {
  /** Distance from tripStart to enter CANDIDATE_ARRIVAL state. */
  candidateRadiusM: 20,
  /** Distance the user must move away from start to EXIT candidate state. */
  candidateExitRadiusM: 30,
  /** Number of consecutive 1-second ticks satisfying candidate conditions before arrival is CONFIRMED. */
  confirmTickCount: 3,
  /** Route progress must be at least this fraction of total outbound distance before arrival can be confirmed. */
  minRouteProgressFraction: 0.75,
  /** GPS accuracy must be better than this to count as a valid candidate tick. */
  maxAccuracyForConfirmM: 50,
} as const;

/**
 * For web: tracking does NOT use background tasks (not supported in browsers).
 * The interval is set to 1000ms to match the original Path-Tracker.
 */
export const WEB_TRACK_INTERVAL_MS = 1000;

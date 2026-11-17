import {
  Coordinate,
  TripPoint,
  Trip,
  TripState,
  TripStats,
  ReturnState,
  MovementState,
  ArrivalState,
} from '../types';
import {
  generateId,
  haversineDistance,
  calculateTotalDistance,
  calculateMaxSpeed,
  bearing,
  paceSecPerKm,
  extractSamePathReturnCorridor,
  validateCoordinate,
  computeCentroid,
  averageDistanceFromCentroid,
  computeMovementConfidence,
} from '../utils/geo';
import {
  OffRouteConfig,
  RoutingConfig,
  TrackingConfig,
  ArrivalConfig,
  MovementConfig,
} from '../constants/theme';
import { SensorState } from './sensor-service';
import * as db from './database-service';
import { fetchRecoveryRoute } from './routing-service';
import {
  notifyOffRoute,
  vibrateOffRoute,
  hasNotificationPermission,
  resetAlertBudget,
} from './alert-service';
import { isOnline } from './network-service';

/**
 * TripEngine is the single source of truth for trip state during a session.
 *
 * ONE AUTHORITATIVE GPS PIPELINE:
 *
 *   DEVICE GPS
 *     ↓
 *   RAW LOCATION
 *     ↓
 *   ENGINE-LEVEL QUALITY FILTER (validateAndFilterFix)
 *     ↓
 *   MOVEMENT STATE (STATIONARY / MOVING / UNCERTAIN)
 *     ↓
 *   ACCEPTED LOCATION  ← last accepted, never a rejected spike
 *     ↓
 *   TRACKING ENGINE (distance, route, heading, arrival, return)
 *     ↓
 *   recordedPath[] / SQLite / UI
 *
 * Key correctness guarantees:
 * - GPS spikes (impossible speed) are NEVER accepted.
 * - Background task fixes go through the same filter as foreground.
 * - Arrival requires a 3-state machine with sustained confirmation.
 * - Route progress is continuity-constrained so a spike can't jump it.
 * - Camera heading is only updated when movement state is MOVING.
 * - Heading is kept stable while STATIONARY.
 * - Outbound points are isolated from return points for corridor matching.
 */

export interface TripSnapshot {
  trip: Trip | null;
  stats: TripStats;
  state: TripState;
  currentPosition: Coordinate | null;
  /** Last ACCEPTED position (may differ from currentPosition if last fix was rejected). */
  acceptedPosition: Coordinate | null;
  gpsAccuracy: number;
  returnState: ReturnState;
  pointCount: number;
  movementState: MovementState;
  /** Movement confidence score 0–1 from multi-signal fusion. */
  movementConfidence: number;
  /** Average spread of recent positions around centroid (metres). */
  positionSpreadM: number;
  /** True during the initial GPS calibration period. */
  isCalibrating: boolean;
}

type Listener = (snap: TripSnapshot) => void;

/** Device compass heading is only trusted while it is this fresh. */
const COMPASS_FRESH_MS = 4000;
/** Persist trip meta at this cadence while the clock is running. */
const META_PERSIST_EVERY = 3;

/**
 * Maximum plausible route-progress change per second (m/s).
 * ~3 m/s = brisk walking/slow jog. Jumps larger than this are continuity-rejected.
 */
const MAX_ROUTE_PROGRESS_CHANGE_MS = 4.0;

// Movement thresholds are now in MovementConfig (theme.ts).
// The constants below are kept for the engine-internal ring buffer size.
// All confidence computation uses MovementConfig values.

class TripEngine {
  private trip: Trip | null = null;
  private activeStartAccum = 0; // accumulated active ms before current segment
  private activeSegmentStart: number | null = null;
  private pendingPoints: TripPoint[] = [];
  private intervalTimer: ReturnType<typeof setInterval> | null = null;
  private tickCount = 0;

  /**
   * Raw current position — updated on every incoming fix (accepted OR rejected).
   * Used only for the UI marker and accuracy ring.
   * Do NOT use for navigation decisions.
   */
  private currentPosition: Coordinate | null = null;

  /**
   * Last ACCEPTED position — passed all quality filters.
   * Used for ALL navigation decisions: distance, route, heading, arrival.
   */
  private lastAcceptedFix: Coordinate | null = null;

  // Return / off-route state
  private returnState: ReturnState = this.emptyReturn();

  // Routing debounce for off-route recovery
  private lastRouteAt = 0;
  private lastRoutePos: Coordinate | null = null;

  // Off-route hysteresis
  private offRouteCount = 0;
  private lastAlertAt = 0;

  // Compass (device heading)
  private deviceHeading: number | null = null;
  private deviceHeadingAt = 0;

  // Performance caches (computed incrementally, not per-fix)
  private maxSpeedCache = 0;

  // ── Movement State ──────────────────────────────────────────────────────────
  /**
   * Position history for random-walk detection and movement confidence.
   * Stores recent accepted GPS fixes (max MovementConfig.positionHistorySize).
   */
  private positionHistory: Coordinate[] = [];

  /**
   * Centroid of the position history — updated on each accepted fix.
   * Used for spread-based stationary detection.
   */
  private positionCentroid: Coordinate | null = null;

  /** Average spread of positions around centroid (metres). */
  private positionSpreadM = 0;

  private stationaryCount = 0;
  private movingCount = 0;
  private movementState: MovementState = 'STATIONARY';

  /** Movement confidence score 0–1, computed from multi-signal fusion. */
  private movementConfidence = 0;

  /** Latest sensor state (accelerometer, step detector). */
  private sensorState: SensorState | null = null;

  // ── Calibration ──────────────────────────────────────────────────────────
  /**
   * After trip start, collect GPS fixes without accumulating distance.
   * This establishes the local GPS noise envelope.
   */
  private calibrationStartTime = 0;
  private isCalibrating = true;

  // ── Arrival State Machine ───────────────────────────────────────────────────
  /**
   * Tracks whether we are approaching, confirming, or away from start.
   * A single GPS fix can NEVER confirm arrival.
   */
  private arrivalState: ArrivalState = 'NOT_NEAR';
  private arrivalCandidateCount = 0;
  /**
   * Outbound route distance at the time returnToStart() was called.
   * Used to compute route-progress fraction for arrival confirmation.
   */
  private outboundRouteDistanceM = 0;

  /**
   * Number of points recorded at the moment the RETURNING state started.
   * Only points[0..outboundPointCount-1] are used for corridor matching.
   * This prevents return-leg points from corrupting navigation.
   */
  private outboundPointCount = 0;

  // ── Route Progress Continuity ───────────────────────────────────────────────
  private lastRouteProgressM = 0;
  private lastRouteProgressAt = 0;

  private listeners = new Set<Listener>();

  // ── GPS Quality Filter (Engine Level) ──────────────────────────────────────

  /**
   * Engine-level GPS quality filter.
   * Applied BEFORE any navigation decision.
   *
   * Returns:
   *   { accepted: true, fix: validatedFix }  — use this fix
   *   { accepted: false, reason: string }     — discard this fix
   *
   * Checks (in order):
   * 1. Basic coordinate validity
   * 2. Accuracy threshold
   * 3. Impossible jump detection (vs lastAcceptedFix)
   * 4. Implied speed vs elapsed time
   */
  private validateAndFilterFix(
    fix: Coordinate
  ): { accepted: true; fix: Coordinate } | { accepted: false; reason: string } {
    // 1. Basic validation
    if (!validateCoordinate(fix)) {
      return { accepted: false, reason: 'invalid_coordinate' };
    }

    // 2. Accuracy gate
    if (
      fix.accuracy !== undefined &&
      fix.accuracy > TrackingConfig.minAccuracyMeters
    ) {
      return {
        accepted: false,
        reason: `poor_accuracy(${fix.accuracy.toFixed(1)}m > ${TrackingConfig.minAccuracyMeters}m)`,
      };
    }

    // 3–4. Jump and implied-speed checks (require a previous accepted fix)
    const prev = this.lastAcceptedFix;
    if (prev) {
      const dist = haversineDistance(prev, fix);
      const dtMs = fix.timestamp - prev.timestamp;
      const dtSec = dtMs / 1000;

      // 3. Impossible jump
      if (dist > TrackingConfig.maxJumpMeters) {
        return {
          accepted: false,
          reason: `jump(${dist.toFixed(1)}m > ${TrackingConfig.maxJumpMeters}m)`,
        };
      }

      // 4. Implied speed check (only when enough time has passed to be meaningful)
      if (dtSec > 0.5 && dist > 1) {
        const impliedSpeed = dist / dtSec;
        if (impliedSpeed > TrackingConfig.maxPlausibleSpeedMs) {
          return {
            accepted: false,
            reason: `speed(${impliedSpeed.toFixed(1)} m/s > ${TrackingConfig.maxPlausibleSpeedMs} m/s)`,
          };
        }
      }

      // 5. Stale timestamp: reject fixes older than the last accepted one
      //    (can happen with batched background updates arriving out of order)
      if (fix.timestamp < prev.timestamp) {
        return { accepted: false, reason: 'stale_timestamp' };
      }
    }

    return { accepted: true, fix };
  }

  // ── Movement State ──────────────────────────────────────────────────────────

  /**
   * Update movement state after an accepted fix using multi-signal fusion.
   *
   * Signals combined:
   *   - Position spread relative to GPS accuracy  (random-walk detection)
   *   - Direction consistency of displacements    (coherent vs random motion)
   *   - GPS-reported speed                        (device velocity estimate)
   *   - Centroid drift over time                  (sustained translation)
   *
   * The confidence score gates ALL downstream calculations:
   *   distance, path recording, heading, camera, route progress.
   */
  private updateMovementState(fix: Coordinate): void {
    // ── Update position history buffer ─────────────────────────────────────
    this.positionHistory.push(fix);
    if (this.positionHistory.length > MovementConfig.positionHistorySize) {
      this.positionHistory.shift();
    }

    // ── Update centroid and spread ─────────────────────────────────────────
    if (this.positionHistory.length >= 3) {
      this.positionCentroid = computeCentroid(this.positionHistory);
      this.positionSpreadM = averageDistanceFromCentroid(
        this.positionHistory,
        this.positionCentroid
      );
    }

    // ── Compute movement confidence ────────────────────────────────────────
    let confidence = computeMovementConfidence(
      this.positionHistory,
      fix.accuracy ?? 999,
      fix.speed,
      this.isCalibrating
    );

    // ── Sensor fusion adjustments ──────────────────────────────────────────
    // Sensor data is supplementary — it adjusts confidence but doesn't
    // override the GPS-based estimate.
    if (this.sensorState) {
      // Phone shake without coherent GPS movement → suppress confidence
      if (this.sensorState.isShaking) {
        confidence *= 0.3; // Heavy penalty for shake
        if (__DEV__) {
          console.log(
            `[SENSOR] shake detected: confidence reduced to ${confidence.toFixed(3)}`
          );
        }
      }

      // Step events without GPS movement → slight boost
      // (helps detect slow walking that GPS alone might miss)
      if (this.sensorState.pedometerAvailable && this.sensorState.stepCount > 0) {
        // Only boost if GPS also shows some displacement
        if (this.positionSpreadM > 1.5) {
          confidence = Math.min(1, confidence * 1.2);
          if (__DEV__) {
            console.log(
              `[SENSOR] steps detected: confidence boosted to ${confidence.toFixed(3)}`
            );
          }
        }
      }
    }

    this.movementConfidence = confidence;

    // ── Transition state based on confidence ───────────────────────────────
    if (this.movementConfidence >= MovementConfig.confidenceMovingThreshold) {
      this.movingCount++;
      this.stationaryCount = 0;
    } else if (this.movementConfidence <= MovementConfig.confidenceStationaryThreshold) {
      this.stationaryCount++;
      this.movingCount = 0;
    }
    // else: uncertain — neither counter advances

    if (this.movingCount >= MovementConfig.movingConfirmCount) {
      this.movementState = 'MOVING';
    } else if (this.stationaryCount >= MovementConfig.stationaryConfirmCount) {
      this.movementState = 'STATIONARY';
    } else if (this.movingCount > 0 || this.stationaryCount > 0) {
      this.movementState = 'UNCERTAIN';
    }
    // else: keep previous state during initialisation
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /** Start a brand new trip. */
  async createTrip(): Promise<void> {
    if (this.trip) return;
    this.stopInterval();
    resetAlertBudget();
    const now = Date.now();
    const first = this.lastAcceptedFix ?? this.currentPosition;
    const trip: Trip = {
      id: generateId(),
      startTime: now,
      totalDistance: 0,
      activeDurationMs: 0,
      state: 'ACTIVE',
      points: first ? [this.toPoint(first, 0)] : [],
      outboundPointCount: first ? 1 : 0,
    };
    this.trip = trip;
    this.activeStartAccum = 0;
    this.activeSegmentStart = now;
    this.pendingPoints = [];
    this.maxSpeedCache = 0;
    this.outboundPointCount = first ? 1 : 0;
    this.outboundRouteDistanceM = 0;
    this.lastRouteProgressM = 0;
    this.lastRouteProgressAt = 0;
    this.exitReturnMode();
    this.arrivalState = 'NOT_NEAR';
    this.arrivalCandidateCount = 0;

    // ── Calibration / movement state reset ─────────────────────────────────
    this.positionHistory = [];
    this.positionCentroid = null;
    this.positionSpreadM = 0;
    this.movementConfidence = 0;
    this.movingCount = 0;
    this.stationaryCount = 0;
    this.movementState = 'STATIONARY';
    this.calibrationStartTime = Date.now();
    this.isCalibrating = true;

    await db.createTrip(trip);
    if (first) {
      await db.appendPoints(trip.id, [trip.points[0]]);
    }
    this.startInterval();
    this.emit();
  }

  /**
   * Accept a raw GPS fix from the location service.
   *
   * PIPELINE:
   *   RAW GPS → QUALITY FILTER → MOVEMENT CONFIDENCE → GATED RECORDING
   *
   * The fix first passes through the engine-level quality filter.
   * If rejected, currentPosition still updates (for the UI accuracy ring)
   * but NO navigation decisions are made.
   *
   * If accepted, movement confidence is computed from position history.
   * Distance accumulation and path recording are ONLY performed when
   * the movement state is MOVING — this is the core anti-noise gate.
   */
  async ingestFix(fix: Coordinate): Promise<void> {
    // Always update raw position for UI (accuracy ring, map marker before filter)
    if (validateCoordinate(fix)) {
      this.currentPosition = fix;
    }

    // Engine-level quality filter
    const result = this.validateAndFilterFix(fix);

    if (__DEV__) {
      if (result.accepted) {
        const dist = this.lastAcceptedFix
          ? haversineDistance(this.lastAcceptedFix, fix).toFixed(1)
          : 'first';
        console.log(
          `[GPS] accepted lat=${fix.latitude.toFixed(6)} lng=${fix.longitude.toFixed(6)}` +
            ` accuracy=${fix.accuracy?.toFixed(1) ?? 'N/A'} speed=${fix.speed?.toFixed(2) ?? 'N/A'}` +
            ` displacement=${dist}m`
        );
      } else {
        console.log(
          `[GPS] REJECTED lat=${fix.latitude.toFixed(6)} reason=${result.reason}`
        );
      }
    }

    if (!result.accepted) {
      // Still emit so UI updates currentPosition for the raw marker/accuracy ring
      this.emit();
      return;
    }

    const accepted = result.fix;

    // ── Update movement state (multi-signal fusion) ────────────────────────
    this.updateMovementState(accepted);

    // ── Update accepted position ───────────────────────────────────────────
    this.lastAcceptedFix = accepted;
    this.currentPosition = accepted; // accepted position is the authoritative UI position

    if (__DEV__) {
      console.log(
        `[MOVEMENT] state=${this.movementState} confidence=${this.movementConfidence.toFixed(3)}` +
          ` spread=${this.positionSpreadM.toFixed(1)}m movingCount=${this.movingCount}` +
          ` stationaryCount=${this.stationaryCount}` +
          ` calibrating=${this.isCalibrating}`
      );
    }

    // ── Return metrics always track the latest ACCEPTED position ───────────
    this.updateReturnMetrics(accepted);

    const t = this.trip;
    if (!t) {
      this.emit();
      return;
    }

    const canRecord = t.state === 'ACTIVE' || t.state === 'RETURNING';
    if (!canRecord) {
      this.emit();
      return;
    }

    this.updateStats();

    // ── Calibration gate ───────────────────────────────────────────────────
    // During the initial calibration period, collect GPS fixes to estimate
    // the local noise envelope but do NOT accumulate any distance.
    if (this.isCalibrating) {
      const elapsed = Date.now() - this.calibrationStartTime;
      const fixesCollected = this.positionHistory.length;
      if (
        elapsed >= MovementConfig.calibrationPeriodMs &&
        fixesCollected >= MovementConfig.calibrationMinFixes
      ) {
        this.isCalibrating = false;
        if (__DEV__) {
          console.log(
            `[CALIBRATION] complete: ${fixesCollected} fixes in ${elapsed}ms` +
              ` spread=${this.positionSpreadM.toFixed(1)}m`
          );
        }
      } else {
        // Still calibrating — record first point but do NOT accumulate distance
        if (t.points.length === 0) {
          const first = this.toPoint(accepted, 0);
          t.points = [first];
          t.outboundPointCount = 1;
          this.outboundPointCount = 1;
          this.pendingPoints = [first];
          if (__DEV__) {
            console.log(
              `[TRACK] START captured during calibration: lat=${first.latitude} lng=${first.longitude}`
            );
          }
          await this.flushPending();
        }
        this.emit();
        return;
      }
    }

    // ── First point after calibration ──────────────────────────────────────
    if (t.points.length === 0) {
      const first = this.toPoint(accepted, 0);
      t.points = [first];
      t.outboundPointCount = 1;
      this.outboundPointCount = 1;
      this.pendingPoints = [first];
      if (__DEV__) {
        console.log(
          `[TRACK] START captured: lat=${first.latitude} lng=${first.longitude}`
        );
      }
      await this.flushPending();
      this.emit();
      return;
    }

    // ── MOVEMENT GATE: only accumulate distance when MOVING ────────────────
    // This is the core anti-noise mechanism.
    // When STATIONARY or UNCERTAIN, GPS oscillations are NOT recorded.
    if (this.movementState !== 'MOVING') {
      if (__DEV__) {
        console.log(
          `[TRACK] distance BLOCKED: state=${this.movementState}` +
            ` confidence=${this.movementConfidence.toFixed(3)}`
        );
      }
      this.emit();
      return;
    }

    // ── Path recording (only when MOVING) ──────────────────────────────────
    if (this.shouldRecordPoint(t.points, accepted)) {
      const last = t.points[t.points.length - 1];
      const point = this.toPoint(accepted, t.points.length);
      const segDist = haversineDistance(last, point);

      // New immutable array reference so React re-renders correctly
      t.points = [...t.points, point];
      this.pendingPoints.push(point);

      // Track outbound point count (only increments during ACTIVE, not RETURNING)
      if (t.state === 'ACTIVE') {
        this.outboundPointCount = t.points.length;
        t.outboundPointCount = this.outboundPointCount;
      }

      t.totalDistance += segDist;
      const dt = (point.timestamp - last.timestamp) / 1000;
      if (dt > 0) {
        const segSpeed = segDist / dt;
        if (segSpeed > this.maxSpeedCache) this.maxSpeedCache = segSpeed;
      }

      if (__DEV__) {
        console.log(
          `[TRACK] points=${t.points.length} outbound=${this.outboundPointCount}` +
            ` segDist=${segDist.toFixed(2)}m totalDist=${t.totalDistance.toFixed(2)}m`
        );
      }

      await this.flushPending();
    }

    // Update return navigation on every accepted fix (not just per-second tick)
    if (t.state === 'RETURNING') {
      this.evaluateReturnTick(accepted);
      this.evaluateArrival(accepted);
    }

    this.emit();
  }

  private toPoint(fix: Coordinate, index: number): TripPoint {
    return {
      latitude: fix.latitude,
      longitude: fix.longitude,
      altitude: fix.altitude,
      accuracy: fix.accuracy,
      heading: fix.heading,
      speed: fix.speed,
      timestamp: fix.timestamp,
      index,
    };
  }

  /**
   * Decide whether a new accepted fix should become a recorded path point.
   *
   * Uses accuracy-aware adaptive sampling:
   * - Very close points (< 1.2m) are always noise — reject.
   * - If GPS accuracy is poor relative to displacement, be more conservative.
   * - Use turn-angle adaptive sampling for good path fidelity.
   *
   * NOTE: This method is only called when movementState === 'MOVING'
   * (the movement gate in ingestFix handles the primary noise rejection).
   */
  private shouldRecordPoint(points: TripPoint[], fix: Coordinate): boolean {
    if (!validateCoordinate(fix)) return false;
    if (points.length === 0) return true;

    const last = points[points.length - 1];
    const dist = haversineDistance(last, fix);

    // Reject micro-jitter (always noise, regardless of accuracy)
    if (dist < 1.2) return false;

    // If accuracy is poor and displacement is small relative to accuracy,
    // require the displacement to be more convincing before recording.
    // This prevents recording GPS noise even during MOVING state.
    if (fix.accuracy !== undefined && fix.accuracy > 0) {
      const displacementConfidence = dist / fix.accuracy;
      // Below 0.4 confidence ratio: the displacement is well within GPS noise
      if (displacementConfidence < MovementConfig.minDisplacementAccuracyRatio && dist < 8) {
        if (__DEV__) {
          console.log(
            `[TRACK] point skipped: dist=${dist.toFixed(1)}m accuracy=${fix.accuracy.toFixed(1)}m confidence=${displacementConfidence.toFixed(2)}`
          );
        }
        return false;
      }
    }

    if (points.length >= 2) {
      const prev = points[points.length - 2];
      const prevBearing = bearing(prev, last);
      const newBearing = bearing(last, fix);
      let angle = Math.abs(prevBearing - newBearing);
      if (angle > 180) angle = 360 - angle;
      const isTurn = angle > TrackingConfig.adaptive.turnAngleThresholdDeg;
      const minDist = isTurn
        ? TrackingConfig.adaptive.turnMinDistance
        : TrackingConfig.adaptive.straightMinDistance;
      return dist >= minDist;
    }

    return dist >= TrackingConfig.adaptive.turnMinDistance;
  }

  private async flushPending(): Promise<void> {
    if (!this.trip || this.pendingPoints.length === 0) return;
    const batch = this.pendingPoints;
    this.pendingPoints = [];
    try {
      await db.appendPoints(this.trip.id, batch);
    } catch {
      this.pendingPoints = batch.concat(this.pendingPoints);
    }
  }

  pause(): void {
    if (!this.trip) return;
    if (this.trip.state !== 'ACTIVE') return;
    this.closeActiveSegment();
    this.trip.state = 'PAUSED';
    this.updateStats();
    this.emit();
    db.updateTripMeta(this.trip).catch(() => {});
  }

  resume(): void {
    if (!this.trip) return;
    if (this.trip.state !== 'PAUSED') return;
    this.activeSegmentStart = Date.now();
    this.trip.state = 'ACTIVE';
    this.updateStats();
    this.emit();
    db.updateTripMeta(this.trip).catch(() => {});
  }

  async endTrip(): Promise<Trip | null> {
    if (!this.trip) return null;
    const t = this.trip;
    t.state = 'COMPLETED';
    t.endTime = Date.now();
    if (this.activeSegmentStart) {
      this.closeActiveSegment();
    }
    if (this.arrivalState === 'CONFIRMED_ARRIVAL') {
      t.returnedToStart = true;
    }
    this.exitReturnMode();
    this.updateStats();

    const activeMs = t.activeDurationMs;
    t.avgSpeed = activeMs > 0 ? t.totalDistance / (activeMs / 1000) : 0;
    const pace = paceSecPerKm(t.totalDistance, activeMs);
    t.avgPaceSecPerKm = pace ?? 0;
    t.maxSpeed = this.maxSpeedCache;

    await this.flushPending();
    await db.updateTripMeta(t);
    this.stopInterval();
    this.trip = null;
    this.activeSegmentStart = null;
    this.pendingPoints = [];
    this.arrivalState = 'NOT_NEAR';
    this.arrivalCandidateCount = 0;

    // Reset movement detection
    this.positionHistory = [];
    this.positionCentroid = null;
    this.positionSpreadM = 0;
    this.movementConfidence = 0;
    this.movingCount = 0;
    this.stationaryCount = 0;
    this.movementState = 'STATIONARY';
    this.isCalibrating = true;

    this.emit();
    return t;
  }

  async recoverTrip(trip: Trip): Promise<void> {
    this.stopInterval();
    this.trip = trip;
    this.pendingPoints = [];

    if (trip.points.length > 0) {
      trip.totalDistance = calculateTotalDistance(trip.points);
      this.maxSpeedCache = calculateMaxSpeed(trip.points);
    } else {
      trip.totalDistance = 0;
      this.maxSpeedCache = 0;
    }

    this.activeStartAccum = trip.activeDurationMs;
    this.activeSegmentStart = trip.state === 'PAUSED' ? null : Date.now();

    // Restore outbound point count (or default to all points if not persisted)
    this.outboundPointCount = trip.outboundPointCount ?? trip.points.length;
    trip.outboundPointCount = this.outboundPointCount;

    if (trip.state === 'RETURNING') {
      this.enterReturnMode();
      // Compute outbound distance for route progress arrival check
      const outboundPoints = trip.points.slice(0, this.outboundPointCount);
      this.outboundRouteDistanceM = calculateTotalDistance(outboundPoints);
    } else {
      this.exitReturnMode();
      this.outboundRouteDistanceM = 0;
    }

    this.arrivalState = 'NOT_NEAR';
    this.arrivalCandidateCount = 0;
    this.lastRouteProgressM = 0;
    this.lastRouteProgressAt = 0;

    // Reset movement detection state
    this.positionHistory = [];
    this.positionCentroid = null;
    this.positionSpreadM = 0;
    this.movementConfidence = 0;
    this.movingCount = 0;
    this.stationaryCount = 0;
    this.movementState = 'STATIONARY';
    this.calibrationStartTime = Date.now();
    this.isCalibrating = true;

    this.startInterval();
    this.emit();
    db.updateTripMeta(trip).catch(() => {});
  }

  async returnToStart(): Promise<boolean> {
    if (!this.trip) return false;
    const start = this.trip.points[0];
    if (!start || this.trip.points.length < 2) return false;

    if (this.trip.state === 'PAUSED') {
      this.activeSegmentStart = Date.now();
    }

    // Snapshot outbound point count before we start adding return-leg points
    this.outboundPointCount = this.trip.points.length;
    this.trip.outboundPointCount = this.outboundPointCount;

    // Compute outbound route distance for arrival progress check
    const outboundPoints = this.trip.points.slice(0, this.outboundPointCount);
    this.outboundRouteDistanceM = calculateTotalDistance(outboundPoints);

    this.trip.state = 'RETURNING';
    this.enterReturnMode();
    this.arrivalState = 'NOT_NEAR';
    this.arrivalCandidateCount = 0;
    this.lastRouteProgressM = 0;
    this.lastRouteProgressAt = 0;

    const pos = this.lastAcceptedFix ?? this.currentPosition ?? start;
    this.updateReturnMetrics(pos);
    this.evaluateReturnTick(pos);
    this.updateStats();
    this.emit();
    db.updateTripMeta(this.trip).catch(() => {});
    return true;
  }

  cancelReturn(): void {
    if (!this.trip) return;
    if (this.arrivalState === 'CONFIRMED_ARRIVAL') {
      this.trip.returnedToStart = true;
    }
    this.trip.state = 'ACTIVE';
    this.exitReturnMode();
    this.arrivalState = 'NOT_NEAR';
    this.arrivalCandidateCount = 0;
    this.emit();
    db.updateTripMeta(this.trip).catch(() => {});
  }

  setDeviceHeading(heading: number): void {
    if (!isFinite(heading)) return;
    this.deviceHeading = heading;
    this.deviceHeadingAt = Date.now();
    if (this.returnState.active) {
      const pos = this.lastAcceptedFix ?? this.currentPosition;
      this.updateReturnMetrics(pos);
      this.emit();
    }
  }

  /**
   * Update sensor state from the sensor service.
   * Sensor data is fused into movement confidence to distinguish:
   *   - Phone shake (high accel, no steps) → suppress movement
   *   - Walking (steps + coherent GPS) → boost confidence
   */
  setSensorState(state: SensorState): void {
    this.sensorState = state;
  }

  /**
   * Called by the store to update raw current position.
   * Does NOT trigger navigation decisions — those happen in ingestFix().
   */
  setCurrentPosition(fix: Coordinate): void {
    this.currentPosition = fix;
    // Only update return metrics if this fix is accepted quality
    // (the store calls this before ingestFix, so we don't double-compute)
  }

  // ── Return Mode ─────────────────────────────────────────────────────────────

  private enterReturnMode(): void {
    const start = this.trip?.points[0];
    if (!start) return;
    this.returnState = this.emptyReturn();
    this.returnState.active = true;
    this.returnState.destination = {
      latitude: start.latitude,
      longitude: start.longitude,
      timestamp: start.timestamp,
    };
    this.offRouteCount = 0;
  }

  private exitReturnMode(): void {
    this.returnState = this.emptyReturn();
    this.offRouteCount = 0;
  }

  // ── Interval ────────────────────────────────────────────────────────────────

  private startInterval(): void {
    this.stopInterval();
    this.intervalTimer = setInterval(() => {
      this.onIntervalTick();
    }, 1000);
  }

  private stopInterval(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    this.tickCount = 0;
  }

  private onIntervalTick(): void {
    const t = this.trip;
    if (!t) return;
    if (
      t.state !== 'ACTIVE' &&
      t.state !== 'RETURNING' &&
      t.state !== 'ARRIVED'
    )
      return;

    this.updateStats();

    if (t.state === 'RETURNING') {
      const pos = this.lastAcceptedFix ?? this.currentPosition;
      if (pos) {
        this.evaluateReturnTick(pos);
        // Evaluate arrival state machine on every tick
        this.evaluateArrival(pos);
      }
    }

    this.tickCount++;
    if (this.tickCount % META_PERSIST_EVERY === 0) {
      void this.flushPending();
      db.updateTripMeta(t).catch(() => {});
    }

    this.emit();
  }

  // ── Return Evaluation ───────────────────────────────────────────────────────

  /**
   * SAME-PATH RETURN EVALUATION (called per accepted fix AND per 1s tick):
   *
   * 1. Use ONLY outbound recorded points for corridor matching.
   * 2. Project current position onto nearest outbound segment.
   * 3. Calculate remaining corridor distance with continuity constraint.
   * 4. Evaluate off-route against 45m corridor threshold with hysteresis.
   * 5. Evaluate arrival state machine.
   */
  private evaluateReturnTick(pos: Coordinate): void {
    const t = this.trip;
    if (!t || t.points.length === 0) return;

    this.updateReturnMetrics(pos);

    // Use only outbound points for corridor matching
    const outboundPoints = t.points.slice(0, this.outboundPointCount || t.points.length);
    if (outboundPoints.length === 0) return;

    // 1. SAME-PATH CORRIDOR EXTRACTION (uses segment projection, not nearest-point)
    const res = extractSamePathReturnCorridor(outboundPoints, pos);
    if (res) {
      this.returnState.returnCorridor = res.returnCorridor;
      this.returnState.reconnectPoint = res.projectedPoint;

      // 2. ROUTE PROGRESS CONTINUITY CONSTRAINT
      const now = Date.now();
      const rawRemainingM = res.remainingDistance;

      let clampedRemainingM = rawRemainingM;
      if (this.lastRouteProgressAt > 0) {
        const elapsedSec = (now - this.lastRouteProgressAt) / 1000;
        const maxChangeM = elapsedSec * MAX_ROUTE_PROGRESS_CHANGE_MS;
        const prevRemainingM = this.lastRouteProgressM;

        // Remaining distance should generally DECREASE as we approach start.
        // A sudden large jump (increase or decrease) is suspicious.
        const change = Math.abs(rawRemainingM - prevRemainingM);
        if (change > maxChangeM + 10) {
          // Clamp the change to plausible range
          const direction = rawRemainingM < prevRemainingM ? -1 : 1;
          clampedRemainingM = prevRemainingM + direction * (maxChangeM + 5);
          if (__DEV__) {
            console.log(
              `[RETURN] routeProgress clamped: raw=${rawRemainingM.toFixed(1)}m` +
                ` prev=${prevRemainingM.toFixed(1)}m` +
                ` clamped=${clampedRemainingM.toFixed(1)}m elapsed=${elapsedSec.toFixed(1)}s`
            );
          }
        }
      }

      this.returnState.remainingCorridorDistance = Math.max(0, clampedRemainingM);
      this.lastRouteProgressM = this.returnState.remainingCorridorDistance;
      this.lastRouteProgressAt = now;

      if (__DEV__) {
        console.log(
          `[RETURN] segDist=${res.distanceToCorridor.toFixed(1)}m` +
            ` routeRemaining=${this.returnState.remainingCorridorDistance.toFixed(1)}m` +
            ` straightLine=${this.returnState.distanceToStart.toFixed(1)}m`
        );
      }

      // 3. OFF-ROUTE DETECTION (hysteresis: separate enter/exit thresholds)
      const accuracyOk =
        (pos.accuracy ?? 0) < OffRouteConfig.minReliableAccuracyMeters;

      let deviated: boolean;
      const currentlyOffRoute =
        this.returnState.offRoute === 'OFF_ROUTE_CONFIRMED' ||
        this.returnState.offRoute === 'OFF_ROUTE_WARNING';

      if (currentlyOffRoute) {
        // Higher bar to re-enter on-route (hysteresis)
        deviated =
          accuracyOk &&
          res.distanceToCorridor > OffRouteConfig.exitThresholdMeters;
      } else {
        deviated =
          accuracyOk &&
          res.distanceToCorridor > OffRouteConfig.thresholdMeters;
      }

      this.evaluateOffRoute(deviated, pos, res.projectedPoint);
    }
  }

  // ── Arrival State Machine ───────────────────────────────────────────────────

  /**
   * Arrival state machine:
   *   NOT_NEAR → CANDIDATE_ARRIVAL → CONFIRMED_ARRIVAL
   *   CANDIDATE_ARRIVAL → NOT_NEAR  (if user moves away)
   *
   * Confirmation requires ALL of:
   *   1. User is physically near tripStart (< candidateRadiusM)
   *   2. Route progress is in the final portion (>= minRouteProgressFraction)
   *   3. GPS accuracy is acceptable (< maxAccuracyForConfirmM)
   *   4. Sustained for >= confirmTickCount consecutive ticks
   *   5. No impossible GPS jump detected (guaranteed by engine filter)
   *   6. Corridor data exists (same-path return is active)
   *   7. Minimum outbound distance has been recorded (prevents false arrival
   *      on ultra-short trips where GPS uncertainty rivals route length)
   */
  private evaluateArrival(pos: Coordinate): void {
    const t = this.trip;
    if (!t || !this.returnState.destination) return;
    if (this.arrivalState === 'CONFIRMED_ARRIVAL') return; // already done

    const distToStart = haversineDistance(pos, this.returnState.destination);
    const accuracy = pos.accuracy ?? 999;

    // Require minimum outbound distance for arrival confirmation.
    // For very short routes (< 30m), GPS uncertainty is comparable to route
    // length, so require tighter proximity instead.
    if (this.outboundRouteDistanceM < 30) {
      // Ultra-short route: require closer proximity (half the normal radius)
      if (distToStart > ArrivalConfig.candidateRadiusM * 0.5) {
        if (this.arrivalState === 'CANDIDATE_ARRIVAL') {
          this.arrivalState = 'NOT_NEAR';
          this.arrivalCandidateCount = 0;
          this.returnState.arrivalState = 'NOT_NEAR';
          this.returnState.arrivalConfirmCount = 0;
        }
        return;
      }
    }

    // Compute route progress fraction for confirmation
    let routeProgressFraction = 0;
    if (this.outboundRouteDistanceM > 0) {
      const travelled =
        this.outboundRouteDistanceM -
        this.returnState.remainingCorridorDistance;
      routeProgressFraction = Math.max(0, travelled) / this.outboundRouteDistanceM;
    } else if (this.returnState.distanceToStart <= ArrivalConfig.candidateRadiusM) {
      // Very short route: progress fraction check relaxed
      routeProgressFraction = 1.0;
    }

    if (__DEV__) {
      console.log(
        `[ARRIVAL] state=${this.arrivalState}` +
          ` distToStart=${distToStart.toFixed(1)}m` +
          ` routeFraction=${routeProgressFraction.toFixed(2)}` +
          ` accuracy=${accuracy.toFixed(1)}m` +
          ` confirmCount=${this.arrivalCandidateCount}` +
          ` corridor=${this.returnState.returnCorridor ? 'yes' : 'no'}` +
          ` outboundDist=${this.outboundRouteDistanceM.toFixed(1)}m`
      );
    }

    switch (this.arrivalState) {
      case 'NOT_NEAR': {
        // Enter candidate state only if ALL conditions are plausible
        const nearDestination = distToStart <= ArrivalConfig.candidateRadiusM;
        const goodProgress =
          routeProgressFraction >= ArrivalConfig.minRouteProgressFraction;
        const accuracyOk = accuracy <= ArrivalConfig.maxAccuracyForConfirmM;
        // Require corridor data for confident arrival — without it, route
        // progress is unreliable and a GPS fix near START could be noise.
        const hasCorridor = this.returnState.returnCorridor !== null
          && this.returnState.returnCorridor.length >= 2;

        if (nearDestination && goodProgress && accuracyOk && hasCorridor) {
          this.arrivalState = 'CANDIDATE_ARRIVAL';
          this.arrivalCandidateCount = 1;
          this.returnState.arrivalState = 'CANDIDATE_ARRIVAL';
          this.returnState.arrivalConfirmCount = 1;
          if (__DEV__)
            console.log('[ARRIVAL] → CANDIDATE_ARRIVAL');
        }
        break;
      }

      case 'CANDIDATE_ARRIVAL': {
        // Exit if user moved away
        if (distToStart > ArrivalConfig.candidateExitRadiusM) {
          this.arrivalState = 'NOT_NEAR';
          this.arrivalCandidateCount = 0;
          this.returnState.arrivalState = 'NOT_NEAR';
          this.returnState.arrivalConfirmCount = 0;
          if (__DEV__)
            console.log(
              `[ARRIVAL] → NOT_NEAR (moved away: ${distToStart.toFixed(1)}m)`
            );
          break;
        }

        // Re-check all confirmation conditions each tick
        const nearDestination = distToStart <= ArrivalConfig.candidateRadiusM;
        const goodProgress =
          routeProgressFraction >= ArrivalConfig.minRouteProgressFraction;
        const accuracyOk = accuracy <= ArrivalConfig.maxAccuracyForConfirmM;
        const hasCorridor = this.returnState.returnCorridor !== null
          && this.returnState.returnCorridor.length >= 2;

        if (nearDestination && goodProgress && accuracyOk && hasCorridor) {
          this.arrivalCandidateCount++;
          this.returnState.arrivalConfirmCount = this.arrivalCandidateCount;
          if (__DEV__)
            console.log(
              `[ARRIVAL] CANDIDATE tick=${this.arrivalCandidateCount}/${ArrivalConfig.confirmTickCount}`
            );
        } else {
          // A bad tick resets the count (conditions must be sustained)
          this.arrivalCandidateCount = 0;
          this.returnState.arrivalConfirmCount = 0;
          if (__DEV__)
            console.log('[ARRIVAL] CANDIDATE count reset (conditions not met)');
        }

        if (this.arrivalCandidateCount >= ArrivalConfig.confirmTickCount) {
          this.arrivalState = 'CONFIRMED_ARRIVAL';
          this.returnState.arrivalState = 'CONFIRMED_ARRIVAL';
          t.state = 'ARRIVED';
          t.returnedToStart = true;
          this.returnState.offRoute = 'ON_ROUTE';
          this.returnState.recoveryRoute = null;
          db.updateTripMeta(t).catch(() => {});
          if (__DEV__)
            console.log('[ARRIVAL] → CONFIRMED_ARRIVAL ✓');
        }
        break;
      }
    }
  }

  // ── Off-Route ───────────────────────────────────────────────────────────────

  private evaluateOffRoute(
    deviated: boolean,
    pos: Coordinate,
    reconnectPoint: Coordinate
  ): void {
    const rs = this.returnState;
    if (!rs.active) return;

    if (deviated) {
      this.offRouteCount++;
      if (
        this.offRouteCount >= 2 &&
        rs.offRoute !== 'OFF_ROUTE_WARNING' &&
        rs.offRoute !== 'OFF_ROUTE_CONFIRMED'
      ) {
        rs.offRoute = 'OFF_ROUTE_WARNING';
      }
      if (
        this.offRouteCount >= OffRouteConfig.confirmCount &&
        rs.offRoute !== 'OFF_ROUTE_CONFIRMED'
      ) {
        rs.offRoute = 'OFF_ROUTE_CONFIRMED';
        rs.lastConfirmedAt = Date.now();
        const now = Date.now();
        if (now - this.lastAlertAt >= OffRouteConfig.alertCooldownMs) {
          this.lastAlertAt = now;
          vibrateOffRoute();
          if (hasNotificationPermission()) {
            void notifyOffRoute();
          }
        }
        // Calculate recovery route using OSRM to reconnect to the recorded corridor
        void this.recalcRecoveryRoute(pos, reconnectPoint);
      }
    } else {
      if (rs.offRoute === 'OFF_ROUTE_CONFIRMED') {
        rs.offRoute = 'RETURNED_TO_ROUTE';
        rs.recoveryRoute = null;
        rs.routeSource = 'corridor';
        this.offRouteCount = 0;
      } else if (rs.offRoute !== 'ON_ROUTE') {
        this.offRouteCount = 0;
        rs.offRoute = 'ON_ROUTE';
        rs.recoveryRoute = null;
        rs.routeSource = 'corridor';
      }
    }
  }

  // ── Return Metrics ──────────────────────────────────────────────────────────

  private updateReturnMetrics(pos: Coordinate | null): void {
    const rs = this.returnState;
    if (!rs.active || !rs.destination) return;
    if (!pos) return;

    rs.distanceToStart = haversineDistance(pos, rs.destination);
    rs.bearingToStart = bearing(pos, rs.destination);

    const compassFresh =
      this.deviceHeading !== null &&
      Date.now() - this.deviceHeadingAt < COMPASS_FRESH_MS;
    if (compassFresh && this.deviceHeading !== null) {
      rs.heading = this.deviceHeading;
      rs.hasHeading = true;
    } else if (pos.heading !== undefined) {
      rs.heading = pos.heading;
      rs.hasHeading = true;
    } else {
      rs.hasHeading = false;
    }

    const pace = this.currentPaceSecPerKm();
    const distanceForEta =
      rs.remainingCorridorDistance > 0
        ? rs.remainingCorridorDistance
        : rs.distanceToStart;
    rs.estimatedMinutes =
      pace !== null ? (distanceForEta / 1000) * (pace / 60) : null;
  }

  private async recalcRecoveryRoute(
    pos: Coordinate,
    reconnectPoint: Coordinate
  ): Promise<void> {
    const rs = this.returnState;
    if (!rs.active) return;
    if (!isOnline()) {
      rs.routeSource = 'offline';
      return;
    }
    const now = Date.now();
    if (now - this.lastRouteAt < RoutingConfig.recalcMinIntervalMs) return;

    this.lastRouteAt = now;
    this.lastRoutePos = pos;
    const route = await fetchRecoveryRoute(pos, reconnectPoint);
    if (route && route.coordinates.length >= 2) {
      rs.recoveryRoute = route.coordinates;
      rs.routeSource = 'recovery';
      this.emit();
    } else {
      rs.routeSource = 'offline';
    }
  }

  // ── Utilities ───────────────────────────────────────────────────────────────

  private currentPaceSecPerKm(): number | null {
    if (!this.trip) return null;
    return paceSecPerKm(
      this.trip.totalDistance,
      this.trip.activeDurationMs || 0
    );
  }

  private closeActiveSegment(): void {
    if (this.activeSegmentStart) {
      this.activeStartAccum += Date.now() - this.activeSegmentStart;
      this.activeSegmentStart = null;
    }
  }

  private updateStats(): void {
    if (!this.trip) return;
    const active =
      (this.trip.state === 'ACTIVE' || this.trip.state === 'RETURNING') &&
      this.activeSegmentStart;
    this.trip.activeDurationMs =
      this.activeStartAccum +
      (active ? Date.now() - (this.activeSegmentStart as number) : 0);
  }

  private stats(): TripStats {
    const t = this.trip;
    if (!t) {
      return {
        distance: 0,
        activeDurationMs: 0,
        avgSpeed: 0,
        avgPaceSecPerKm: 0,
        maxSpeed: 0,
        pointCount: 0,
      };
    }
    const activeMs = t.activeDurationMs;
    const avgSpeed = activeMs > 0 ? t.totalDistance / (activeMs / 1000) : 0;
    const pace = paceSecPerKm(t.totalDistance, activeMs);
    return {
      distance: t.totalDistance,
      activeDurationMs: activeMs,
      avgSpeed,
      avgPaceSecPerKm: pace ?? 0,
      maxSpeed: this.maxSpeedCache,
      pointCount: t.points.length,
    };
  }

  private snapshot(): TripSnapshot {
    const t = this.trip;
    return {
      trip: t
        ? {
            ...t,
            points: [...t.points],
          }
        : null,
      stats: this.stats(),
      state: t?.state ?? 'IDLE',
      currentPosition: this.currentPosition
        ? { ...this.currentPosition }
        : null,
      acceptedPosition: this.lastAcceptedFix
        ? { ...this.lastAcceptedFix }
        : null,
      gpsAccuracy: this.currentPosition?.accuracy ?? 999,
      returnState: {
        ...this.returnState,
        arrivalState: this.arrivalState,
        arrivalConfirmCount: this.arrivalCandidateCount,
        returnCorridor: this.returnState.returnCorridor
          ? [...this.returnState.returnCorridor]
          : null,
        recoveryRoute: this.returnState.recoveryRoute
          ? [...this.returnState.recoveryRoute]
          : null,
        onlineRoute: this.returnState.onlineRoute
          ? [...this.returnState.onlineRoute]
          : null,
      },
      pointCount: t?.points.length ?? 0,
      movementState: this.movementState,
      movementConfidence: this.movementConfidence,
      positionSpreadM: this.positionSpreadM,
      isCalibrating: this.isCalibrating,
    };
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.snapshot());
    return () => this.listeners.delete(fn);
  }

  getTrip(): Trip | null {
    return this.trip;
  }

  getSnapshot(): TripSnapshot {
    return this.snapshot();
  }

  getCurrentPosition(): Coordinate | null {
    return this.currentPosition;
  }

  getLastAcceptedFix(): Coordinate | null {
    return this.lastAcceptedFix;
  }

  getMovementState(): MovementState {
    return this.movementState;
  }

  getMovementConfidence(): number {
    return this.movementConfidence;
  }

  getPositionSpreadM(): number {
    return this.positionSpreadM;
  }

  getIsCalibrating(): boolean {
    return this.isCalibrating;
  }

  private emit(): void {
    const snap = this.snapshot();
    for (const l of this.listeners) l(snap);
  }

  private emptyReturn(): ReturnState {
    return {
      active: false,
      distanceToStart: 0,
      remainingCorridorDistance: 0,
      bearingToStart: 0,
      heading: 0,
      hasHeading: false,
      destination: null,
      estimatedMinutes: null,
      offRoute: 'ON_ROUTE',
      lastConfirmedAt: 0,
      returnCorridor: null,
      recoveryRoute: null,
      reconnectPoint: null,
      onlineRoute: null,
      routeSource: 'none',
      arrivalState: 'NOT_NEAR',
      arrivalConfirmCount: 0,
    };
  }
}

/** Singleton engine instance. */
export const tripEngine = new TripEngine();

// TripEngine - Core tracking engine based on original Path-Tracker's TripEngine
import type {
  Coordinate,
  TripPoint,
  Trip,
  TripState,
  TripStats,
  ReturnState,
  MovementState,
  ArrivalState,
  TripSnapshot,
} from '../types';

export {
  Coordinate,
  TripPoint,
  Trip,
  TripState,
  TripStats,
  ReturnState,
  MovementState,
  ArrivalState,
  TripSnapshot,
};
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
} from './geo';
import {
  TrackingConfig,
  MovementConfig,
  OffRouteConfig,
  ArrivalConfig,
  WEB_TRACK_INTERVAL_MS,
} from './config';

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
 *   recordedPath[] / storage / UI
 *
 * Key correctness guarantees:
 * - GPS spikes (impossible speed) are NEVER accepted.
 * - Movement gate: distance only accumulates when MOVING state is confirmed.
 * - Calibration period: no distance accumulated for first 5 seconds.
 * - Arrival requires a 3-state machine with sustained confirmation.
 */

type Listener = (snap: TripSnapshot) => void;

/** Device compass heading is only trusted while it is this fresh. */
const COMPASS_FRESH_MS = 4000;
/** Persist trip meta at this cadence while the clock is running. */
const META_PERSIST_EVERY = 3;

/** Maximum plausible route-progress change per second (m/s). */
const MAX_ROUTE_PROGRESS_CHANGE_MS = 4.0;

class TripEngine {
  private trip: Trip | null = null;
  private activeStartAccum = 0;
  private activeSegmentStart: number | null = null;
  private pendingPoints: TripPoint[] = [];
  private intervalTimer: ReturnType<typeof setInterval> | null = null;
  private tickCount = 0;

  private currentPosition: Coordinate | null = null;
  private lastAcceptedFix: Coordinate | null = null;

  private returnState: ReturnState = this.emptyReturn();
  private lastRouteAt = 0;
  private lastRoutePos: Coordinate | null = null;
  private offRouteCount = 0;
  private lastAlertAt = 0;

  private deviceHeading: number | null = null;
  private deviceHeadingAt = 0;

  private maxSpeedCache = 0;

  // Movement state
  private positionHistory: Coordinate[] = [];
  private positionCentroid: Coordinate | null = null;
  private positionSpreadM = 0;
  private stationaryCount = 0;
  private movingCount = 0;
  private movementState: MovementState = 'STATIONARY';
  private movementConfidence = 0;

  // Calibration
  private calibrationStartTime = 0;
  private isCalibrating = true;

  // Arrival state machine
  private arrivalState: ArrivalState = 'NOT_NEAR';
  private arrivalCandidateCount = 0;
  private outboundRouteDistanceM = 0;
  private outboundPointCount = 0;

  // Route progress continuity
  private lastRouteProgressM = 0;
  private lastRouteProgressAt = 0;

  private listeners = new Set<Listener>();

  // ── GPS Quality Filter (Engine Level) ──────────────────────────────────────

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

    // 3-4. Jump and implied-speed checks
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

      // 4. Implied speed check
      if (dtSec > 0.5 && dist > 1) {
        const impliedSpeed = dist / dtSec;
        if (impliedSpeed > TrackingConfig.maxPlausibleSpeedMs) {
          return {
            accepted: false,
            reason: `speed(${impliedSpeed.toFixed(1)} m/s > ${TrackingConfig.maxPlausibleSpeedMs} m/s)`,
          };
        }
      }

      // 5. Stale timestamp
      if (fix.timestamp < prev.timestamp) {
        return { accepted: false, reason: 'stale_timestamp' };
      }
    }

    return { accepted: true, fix };
  }

  // ── Movement State ──────────────────────────────────────────────────────────

  private updateMovementState(fix: Coordinate): void {
    // Update position history buffer
    this.positionHistory.push(fix);
    if (this.positionHistory.length > MovementConfig.positionHistorySize) {
      this.positionHistory.shift();
    }

    // Update centroid and spread
    if (this.positionHistory.length >= 3) {
      this.positionCentroid = computeCentroid(this.positionHistory);
      this.positionSpreadM = averageDistanceFromCentroid(
        this.positionHistory,
        this.positionCentroid
      );
    }

    // Compute movement confidence
    let confidence = computeMovementConfidence(
      this.positionHistory,
      fix.accuracy ?? 999,
      fix.speed,
      this.isCalibrating
    );

    this.movementConfidence = confidence;

    // Transition state based on confidence
    if (this.movementConfidence >= MovementConfig.confidenceMovingThreshold) {
      this.movingCount++;
      this.stationaryCount = 0;
    } else if (this.movementConfidence <= MovementConfig.confidenceStationaryThreshold) {
      this.stationaryCount++;
      this.movingCount = 0;
    }

    if (this.movingCount >= MovementConfig.movingConfirmCount) {
      this.movementState = 'MOVING';
    } else if (this.stationaryCount >= MovementConfig.stationaryConfirmCount) {
      this.movementState = 'STATIONARY';
    } else if (this.movingCount > 0 || this.stationaryCount > 0) {
      this.movementState = 'UNCERTAIN';
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /** Start a brand new trip. */
  async createTrip(): Promise<void> {
    if (this.trip) return;
    this.stopInterval();

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

    // Reset calibration / movement state
    this.positionHistory = [];
    this.positionCentroid = null;
    this.positionSpreadM = 0;
    this.movementConfidence = 0;
    this.movingCount = 0;
    this.stationaryCount = 0;
    this.movementState = 'STATIONARY';
    this.calibrationStartTime = Date.now();
    this.isCalibrating = true;

    if (first) {
      // In web, we don't have DB, but we track the initial point
    }
    this.startInterval();
    this.emit();
  }

  /**
   * Accept a raw GPS fix from the location service.
   *
   * PIPELINE:
   *   RAW GPS → QUALITY FILTER → MOVEMENT CONFIDENCE → GATED RECORDING
   */
  async ingestFix(fix: Coordinate): Promise<void> {
    // Always update raw position for UI
    if (validateCoordinate(fix)) {
      this.currentPosition = fix;
    }

    // Engine-level quality filter
    const result = this.validateAndFilterFix(fix);

    if (!result.accepted) {
      this.emit();
      return;
    }

    const accepted = result.fix;

    // Update movement state
    this.updateMovementState(accepted);

    // Update accepted position
    this.lastAcceptedFix = accepted;
    this.currentPosition = accepted;

    // Return metrics always track the latest ACCEPTED position
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

    // Calibration gate
    if (this.isCalibrating) {
      const elapsed = Date.now() - this.calibrationStartTime;
      const fixesCollected = this.positionHistory.length;
      if (
        elapsed >= MovementConfig.calibrationPeriodMs &&
        fixesCollected >= MovementConfig.calibrationMinFixes
      ) {
        this.isCalibrating = false;
      } else {
        // Still calibrating - record first point but do NOT accumulate distance
        if (t.points.length === 0) {
          const first = this.toPoint(accepted, 0);
          t.points = [first];
          t.outboundPointCount = 1;
          this.outboundPointCount = 1;
          this.pendingPoints = [first];
        }
        this.emit();
        return;
      }
    }

    // First point after calibration
    if (t.points.length === 0) {
      const first = this.toPoint(accepted, 0);
      t.points = [first];
      t.outboundPointCount = 1;
      this.outboundPointCount = 1;
      this.pendingPoints = [first];
      this.emit();
      return;
    }

    // MOVEMENT GATE: only accumulate distance when MOVING
    if (this.movementState !== 'MOVING') {
      this.emit();
      return;
    }

    // Path recording (only when MOVING)
    if (this.shouldRecordPoint(t.points, accepted)) {
      const last = t.points[t.points.length - 1];
      const point = this.toPoint(accepted, t.points.length);
      const segDist = haversineDistance(last, point);

      t.points = [...t.points, point];
      this.pendingPoints.push(point);

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

      this.emit();
    }

    // Update return navigation
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
   */
  private shouldRecordPoint(points: TripPoint[], fix: Coordinate): boolean {
    if (!validateCoordinate(fix)) return false;
    if (points.length === 0) return true;

    const last = points[points.length - 1];
    const dist = haversineDistance(last, fix);

    // Reject micro-jitter
    if (dist < 1.2) return false;

    // If accuracy is poor and displacement is small relative to accuracy
    if (fix.accuracy !== undefined && fix.accuracy > 0) {
      const displacementConfidence = dist / fix.accuracy;
      if (displacementConfidence < MovementConfig.minDisplacementAccuracyRatio && dist < 8) {
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

  pause(): void {
    if (!this.trip) return;
    if (this.trip.state !== 'ACTIVE') return;
    this.closeActiveSegment();
    this.trip.state = 'PAUSED';
    this.updateStats();
    this.emit();
  }

  resume(): void {
    if (!this.trip) return;
    if (this.trip.state !== 'PAUSED') return;
    this.activeSegmentStart = Date.now();
    this.trip.state = 'ACTIVE';
    this.updateStats();
    this.emit();
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

  setCurrentPosition(fix: Coordinate): void {
    this.currentPosition = fix;
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
    }, WEB_TRACK_INTERVAL_MS);
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
        this.evaluateArrival(pos);
      }
    }

    this.tickCount++;
    if (this.tickCount % META_PERSIST_EVERY === 0) {
      // In web, no DB persistence needed
    }

    this.emit();
  }

  // ── Return Evaluation ───────────────────────────────────────────────────────

  private evaluateReturnTick(pos: Coordinate): void {
    const t = this.trip;
    if (!t || t.points.length === 0) return;

    this.updateReturnMetrics(pos);

    const outboundPoints = t.points.slice(0, this.outboundPointCount || t.points.length);
    if (outboundPoints.length === 0) return;

    const res = extractSamePathReturnCorridor(outboundPoints, pos);
    if (res) {
      this.returnState.returnCorridor = res.returnCorridor.map(p => ({
        latitude: p.latitude,
        longitude: p.longitude,
        timestamp: p.timestamp ?? Date.now(),
      }));
      this.returnState.reconnectPoint = {
        latitude: res.projectedPoint.latitude,
        longitude: res.projectedPoint.longitude,
        timestamp: res.projectedPoint.timestamp ?? Date.now(),
      };

      // Route progress continuity constraint
      const now = Date.now();
      const rawRemainingM = res.remainingDistance;

      let clampedRemainingM = rawRemainingM;
      if (this.lastRouteProgressAt > 0) {
        const elapsedSec = (now - this.lastRouteProgressAt) / 1000;
        const maxChangeM = elapsedSec * MAX_ROUTE_PROGRESS_CHANGE_MS;
        const prevRemainingM = this.lastRouteProgressM;

        const change = Math.abs(rawRemainingM - prevRemainingM);
        if (change > maxChangeM + 10) {
          const direction = rawRemainingM < prevRemainingM ? -1 : 1;
          clampedRemainingM = prevRemainingM + direction * (maxChangeM + 5);
        }
      }

      this.returnState.remainingCorridorDistance = Math.max(0, clampedRemainingM);
      this.lastRouteProgressM = this.returnState.remainingCorridorDistance;
      this.lastRouteProgressAt = now;

      // Off-route detection
      const accuracyOk =
        (pos.accuracy ?? 0) < OffRouteConfig.minReliableAccuracyMeters;

      let deviated: boolean;
      const currentlyOffRoute =
        this.returnState.offRoute === 'OFF_ROUTE_CONFIRMED' ||
        this.returnState.offRoute === 'OFF_ROUTE_WARNING';

      if (currentlyOffRoute) {
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

  private evaluateArrival(pos: Coordinate): void {
    const t = this.trip;
    if (!t || !this.returnState.destination) return;
    if (this.arrivalState === 'CONFIRMED_ARRIVAL') return;

    const distToStart = haversineDistance(pos, this.returnState.destination);
    const accuracy = pos.accuracy ?? 999;

    if (this.outboundRouteDistanceM < 30) {
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

    let routeProgressFraction = 0;
    if (this.outboundRouteDistanceM > 0) {
      const travelled =
        this.outboundRouteDistanceM -
        this.returnState.remainingCorridorDistance;
      routeProgressFraction = Math.max(0, travelled) / this.outboundRouteDistanceM;
    } else if (this.returnState.distanceToStart <= ArrivalConfig.candidateRadiusM) {
      routeProgressFraction = 1.0;
    }

    switch (this.arrivalState) {
      case 'NOT_NEAR': {
        const nearDestination = distToStart <= ArrivalConfig.candidateRadiusM;
        const goodProgress =
          routeProgressFraction >= ArrivalConfig.minRouteProgressFraction;
        const accuracyOk = accuracy <= ArrivalConfig.maxAccuracyForConfirmM;
        const hasCorridor = this.returnState.returnCorridor !== null
          && this.returnState.returnCorridor.length >= 2;

        if (nearDestination && goodProgress && accuracyOk && hasCorridor) {
          this.arrivalState = 'CANDIDATE_ARRIVAL';
          this.arrivalCandidateCount = 1;
          this.returnState.arrivalState = 'CANDIDATE_ARRIVAL';
          this.returnState.arrivalConfirmCount = 1;
        }
        break;
      }

      case 'CANDIDATE_ARRIVAL': {
        if (distToStart > ArrivalConfig.candidateExitRadiusM) {
          this.arrivalState = 'NOT_NEAR';
          this.arrivalCandidateCount = 0;
          this.returnState.arrivalState = 'NOT_NEAR';
          this.returnState.arrivalConfirmCount = 0;
          break;
        }

        const nearDestination = distToStart <= ArrivalConfig.candidateRadiusM;
        const goodProgress =
          routeProgressFraction >= ArrivalConfig.minRouteProgressFraction;
        const accuracyOk = accuracy <= ArrivalConfig.maxAccuracyForConfirmM;
        const hasCorridor = this.returnState.returnCorridor !== null
          && this.returnState.returnCorridor.length >= 2;

        if (nearDestination && goodProgress && accuracyOk && hasCorridor) {
          this.arrivalCandidateCount++;
          this.returnState.arrivalConfirmCount = this.arrivalCandidateCount;
        } else {
          this.arrivalCandidateCount = 0;
          this.returnState.arrivalConfirmCount = 0;
        }

        if (this.arrivalCandidateCount >= ArrivalConfig.confirmTickCount) {
          this.arrivalState = 'CONFIRMED_ARRIVAL';
          this.returnState.arrivalState = 'CONFIRMED_ARRIVAL';
          t.state = 'ARRIVED';
          (t as Trip & { returnedToStart?: boolean }).returnedToStart = true;
          this.returnState.offRoute = 'ON_ROUTE';
          this.returnState.recoveryRoute = null;
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
      routeSource: 'none',
      arrivalState: 'NOT_NEAR',
      arrivalConfirmCount: 0,
    };
  }
}

/** Singleton engine instance. */
export const tripEngine = new TripEngine();

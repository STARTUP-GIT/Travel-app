import {
  Coordinate,
  TripPoint,
  Trip,
  TripState,
  TripStats,
  ReturnState,
  MovementState,
  ArrivalState,
} from './types';
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
  OffRouteConfig,
  RoutingConfig,
  TrackingConfig,
  ArrivalConfig,
  MovementConfig,
} from './theme';
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

type Listener = (snap: TripSnapshot) => void;

const COMPASS_FRESH_MS = 4000;
const META_PERSIST_EVERY = 3;
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

  private positionHistory: Coordinate[] = [];
  private positionCentroid: Coordinate | null = null;
  private positionSpreadM = 0;

  private stationaryCount = 0;
  private movingCount = 0;
  private movementState: MovementState = 'STATIONARY';

  private movementConfidence = 0;

  private sensorState: SensorState | null = null;

  private calibrationStartTime = 0;
  private isCalibrating = true;

  private arrivalState: ArrivalState = 'NOT_NEAR';
  private arrivalCandidateCount = 0;
  private outboundRouteDistanceM = 0;
  private outboundPointCount = 0;

  private lastRouteProgressM = 0;
  private lastRouteProgressAt = 0;

  private listeners = new Set<Listener>();

  private validateAndFilterFix(
    fix: Coordinate
  ): { accepted: true; fix: Coordinate } | { accepted: false; reason: string } {
    if (!validateCoordinate(fix)) {
      return { accepted: false, reason: 'invalid_coordinate' };
    }

    if (
      fix.accuracy !== undefined &&
      fix.accuracy !== null &&
      fix.accuracy > TrackingConfig.minAccuracyMeters
    ) {
      return {
        accepted: false,
        reason: `poor_accuracy(${fix.accuracy.toFixed(1)}m > ${TrackingConfig.minAccuracyMeters}m)`,
      };
    }

    const prev = this.lastAcceptedFix;
    if (prev) {
      const dist = haversineDistance(prev, fix);
      const dtMs = fix.timestamp - prev.timestamp;
      const dtSec = dtMs / 1000;

      if (dist > TrackingConfig.maxJumpMeters) {
        return {
          accepted: false,
          reason: `jump(${dist.toFixed(1)}m > ${TrackingConfig.maxJumpMeters}m)`,
        };
      }

      if (dtSec > 0.5 && dist > 1) {
        const impliedSpeed = dist / dtSec;
        if (impliedSpeed > TrackingConfig.maxPlausibleSpeedMs) {
          return {
            accepted: false,
            reason: `speed(${impliedSpeed.toFixed(1)} m/s > ${TrackingConfig.maxPlausibleSpeedMs} m/s)`,
          };
        }
      }

      if (fix.timestamp < prev.timestamp) {
        return { accepted: false, reason: 'stale_timestamp' };
      }
    }

    return { accepted: true, fix };
  }

  private updateMovementState(fix: Coordinate): void {
    this.positionHistory.push(fix);
    if (this.positionHistory.length > MovementConfig.positionHistorySize) {
      this.positionHistory.shift();
    }

    if (this.positionHistory.length >= 3) {
      this.positionCentroid = computeCentroid(this.positionHistory);
      this.positionSpreadM = averageDistanceFromCentroid(
        this.positionHistory,
        this.positionCentroid
      );
    }

    let confidence = computeMovementConfidence(
      this.positionHistory,
      fix.accuracy ?? 999,
      fix.speed,
      this.isCalibrating
    );

    if (this.sensorState) {
      if (this.sensorState.isShaking) {
        confidence *= 0.3;
      }
      if (this.sensorState.pedometerAvailable && this.sensorState.stepCount > 0) {
        if (this.positionSpreadM > 1.5) {
          confidence = Math.min(1, confidence * 1.2);
        }
      }
    }

    this.movementConfidence = confidence;

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

  async ingestFix(fix: Coordinate): Promise<void> {
    if (validateCoordinate(fix)) {
      this.currentPosition = fix;
    }

    const result = this.validateAndFilterFix(fix);
    if (!result.accepted) {
      this.emit();
      return;
    }

    const accepted = result.fix;

    this.updateMovementState(accepted);
    this.lastAcceptedFix = accepted;
    this.currentPosition = accepted;

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

    if (this.isCalibrating) {
      const elapsed = Date.now() - this.calibrationStartTime;
      const fixesCollected = this.positionHistory.length;
      if (
        elapsed >= MovementConfig.calibrationPeriodMs &&
        fixesCollected >= MovementConfig.calibrationMinFixes
      ) {
        this.isCalibrating = false;
      } else {
        if (t.points.length === 0) {
          const first = this.toPoint(accepted, 0);
          t.points = [first];
          t.outboundPointCount = 1;
          this.outboundPointCount = 1;
          this.pendingPoints = [first];
          await this.flushPending();
        }
        this.emit();
        return;
      }
    }

    if (t.points.length === 0) {
      const first = this.toPoint(accepted, 0);
      t.points = [first];
      t.outboundPointCount = 1;
      this.outboundPointCount = 1;
      this.pendingPoints = [first];
      await this.flushPending();
      this.emit();
      return;
    }

    if (this.movementState !== 'MOVING') {
      this.emit();
      return;
    }

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

      await this.flushPending();
    }

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
      altitude: fix.altitude ?? undefined,
      accuracy: fix.accuracy ?? undefined,
      heading: fix.heading ?? undefined,
      speed: fix.speed ?? undefined,
      timestamp: fix.timestamp,
      index,
    };
  }

  private shouldRecordPoint(points: TripPoint[], fix: Coordinate): boolean {
    if (!validateCoordinate(fix)) return false;
    if (points.length === 0) return true;

    const last = points[points.length - 1];
    const dist = haversineDistance(last, fix);

    if (dist < 1.2) return false;

    if (fix.accuracy !== undefined && fix.accuracy !== null && fix.accuracy > 0) {
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

    this.outboundPointCount = trip.outboundPointCount ?? trip.points.length;
    trip.outboundPointCount = this.outboundPointCount;

    if (trip.state === 'RETURNING') {
      this.enterReturnMode();
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

    this.outboundPointCount = this.trip.points.length;
    this.trip.outboundPointCount = this.outboundPointCount;

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

  setSensorState(state: SensorState): void {
    this.sensorState = state;
  }

  setCurrentPosition(fix: Coordinate): void {
    this.currentPosition = fix;
  }

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

  private evaluateReturnTick(pos: Coordinate): void {
    const t = this.trip;
    if (!t || t.points.length === 0) return;

    this.updateReturnMetrics(pos);

    const outboundPoints = t.points.slice(0, this.outboundPointCount || t.points.length);
    if (outboundPoints.length === 0) return;

    const res = extractSamePathReturnCorridor(outboundPoints, pos);
    if (res) {
      this.returnState.returnCorridor = res.returnCorridor;
      this.returnState.reconnectPoint = res.projectedPoint;

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
          t.returnedToStart = true;
          this.returnState.offRoute = 'ON_ROUTE';
          this.returnState.recoveryRoute = null;
          db.updateTripMeta(t).catch(() => {});
        }
        break;
      }
    }
  }

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
    } else if (pos.heading !== undefined && pos.heading !== null) {
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
      pace !== null ? Math.round((distanceForEta / 1000) * (pace / 60)) : null;
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

export const tripEngine = new TripEngine();

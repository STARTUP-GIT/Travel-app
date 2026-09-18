import { Coordinate, MapRegion } from '../types';

const EARTH_RADIUS_M = 6371000;

export function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function haversineDistance(a: Coordinate, b: Coordinate): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Bearing (degrees, 0-360) from a toward b. */
export function bearing(a: Coordinate, b: Coordinate): number {
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const dLon = toRad(b.longitude - a.longitude);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Smallest absolute angular difference between two headings. */
export function headingDelta(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** Interpolates current angle towards target angle handling 360 wrap-around shortest direction. */
export function interpolateAngle(from: number, to: number, alpha: number): number {
  const diff = ((to - from + 540) % 360) - 180;
  return (from + alpha * diff + 360) % 360;
}


export function smoothHeading(headings: number[]): number {
  if (headings.length === 0) return 0;
  if (headings.length === 1) return headings[0];

  let sinSum = 0;
  let cosSum = 0;
  for (const h of headings) {
    sinSum += Math.sin(toRad(h));
    cosSum += Math.cos(toRad(h));
  }

  return (toDeg(Math.atan2(sinSum, cosSum)) + 360) % 360;
}

/**
 * Perpendicular distance from a point to the line segment [a, b], in metres.
 * Works in projected XY space local to the segment origin.
 */
export function pointToSegmentDistance(
  point: Coordinate,
  a: Coordinate,
  b: Coordinate
): number {
  const Ax = toRad(a.latitude);
  const Ay = toRad(a.longitude);
  const Bx = toRad(b.latitude);
  const By = toRad(b.longitude);
  const Px = toRad(point.latitude);
  const Py = toRad(point.longitude);

  const ABx = (Bx - Ax) * EARTH_RADIUS_M;
  const ABy = (By - Ay) * EARTH_RADIUS_M * Math.cos(Ax);
  const APx = (Px - Ax) * EARTH_RADIUS_M;
  const APy = (Py - Ay) * EARTH_RADIUS_M * Math.cos(Ax);

  const lenSq = ABx * ABx + ABy * ABy;
  if (lenSq === 0) {
    return Math.sqrt(APx * APx + APy * APy);
  }

  let t = (APx * ABx + APy * ABy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = t * ABx;
  const projY = t * ABy;
  const dx = APx - projX;
  const dy = APy - projY;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Project a point onto line segment [a, b], returning projected point and parameter t in [0, 1]. */
export function projectPointOnSegment(
  point: Coordinate,
  a: Coordinate,
  b: Coordinate
): { projectedPoint: Coordinate; t: number; distanceMeters: number } {
  const Ax = toRad(a.latitude);
  const Ay = toRad(a.longitude);
  const Bx = toRad(b.latitude);
  const By = toRad(b.longitude);
  const Px = toRad(point.latitude);
  const Py = toRad(point.longitude);

  const ABx = (Bx - Ax) * EARTH_RADIUS_M;
  const ABy = (By - Ay) * EARTH_RADIUS_M * Math.cos(Ax);
  const APx = (Px - Ax) * EARTH_RADIUS_M;
  const APy = (Py - Ay) * EARTH_RADIUS_M * Math.cos(Ax);

  const lenSq = ABx * ABx + ABy * ABy;
  let t = 0;
  if (lenSq > 0) {
    t = Math.max(0, Math.min(1, (APx * ABx + APy * ABy) / lenSq));
  }

  const projLat = a.latitude + t * (b.latitude - a.latitude);
  const projLng = a.longitude + t * (b.longitude - a.longitude);
  const projectedPoint: Coordinate = {
    latitude: projLat,
    longitude: projLng,
    timestamp: point.timestamp,
  };

  const distanceMeters = haversineDistance(point, projectedPoint);
  return { projectedPoint, t, distanceMeters };
}

/** Find nearest segment of a polyline corridor to a given point. */
export function findNearestSegmentAndProjection(
  point: Coordinate,
  line: Coordinate[]
): { segmentIndex: number; projectedPoint: Coordinate; distanceMeters: number } | null {
  if (!line || line.length === 0) return null;
  if (line.length === 1) {
    return {
      segmentIndex: 0,
      projectedPoint: { ...line[0] },
      distanceMeters: haversineDistance(point, line[0]),
    };
  }

  let minDistance = Infinity;
  let bestSegment = 0;
  let bestProj: Coordinate = line[0];

  for (let i = 0; i < line.length - 1; i++) {
    const { projectedPoint, distanceMeters } = projectPointOnSegment(point, line[i], line[i + 1]);
    if (distanceMeters < minDistance) {
      minDistance = distanceMeters;
      bestSegment = i;
      bestProj = projectedPoint;
    }
  }

  return {
    segmentIndex: bestSegment,
    projectedPoint: bestProj,
    distanceMeters: minDistance,
  };
}

/**
 * Extract same-path return corridor:
 * 1. Find nearest segment on recordedPath [P0, P1, ..., Pn] to currentPosition.
 * 2. Project currentPosition onto that segment.
 * 3. Extract slice from P0 up to segment end P_k.
 * 4. Append projected point at the end.
 * 5. Reverse array so direction is [P_proj, P_k, P_{k-1}, ..., P1, P0].
 * 6. Calculate cumulative distance along this return path.
 */
export function extractSamePathReturnCorridor(
  recordedPath: Coordinate[],
  currentPosition: Coordinate
): {
  returnCorridor: Coordinate[];
  remainingDistance: number;
  projectedPoint: Coordinate;
  segmentIndex: number;
  distanceToCorridor: number;
} | null {
  if (!recordedPath || recordedPath.length === 0) return null;
  if (recordedPath.length === 1) {
    const p0 = recordedPath[0];
    const dist = haversineDistance(currentPosition, p0);
    return {
      returnCorridor: [currentPosition, p0],
      remainingDistance: dist,
      projectedPoint: p0,
      segmentIndex: 0,
      distanceToCorridor: dist,
    };
  }

  const nearest = findNearestSegmentAndProjection(currentPosition, recordedPath);
  if (!nearest) return null;

  const { segmentIndex, projectedPoint, distanceMeters } = nearest;

  // recordedPath slice from P0 up to segmentIndex
  // Note: if user is on segment [P_i, P_{i+1}], the path back to start goes:
  // projectedPoint -> P_i -> P_{i-1} -> ... -> P0
  const slicedForward: Coordinate[] = [];
  for (let i = 0; i <= segmentIndex; i++) {
    slicedForward.push(recordedPath[i]);
  }
  slicedForward.push(projectedPoint);

  // Reverse so it starts at projectedPoint and ends at P0 (START)
  const returnCorridor = slicedForward.reverse();

  // Deduplicate very close points if any
  const cleanedCorridor: Coordinate[] = [returnCorridor[0]];
  for (let i = 1; i < returnCorridor.length; i++) {
    if (haversineDistance(cleanedCorridor[cleanedCorridor.length - 1], returnCorridor[i]) > 0.5) {
      cleanedCorridor.push(returnCorridor[i]);
    }
  }

  const remainingDistance = calculateTotalDistance(cleanedCorridor);

  return {
    returnCorridor: cleanedCorridor,
    remainingDistance,
    projectedPoint,
    segmentIndex,
    distanceToCorridor: distanceMeters,
  };
}

/** Distance from a point to the nearest segment of a polyline corridor. */
export function distanceToPolyline(
  point: Coordinate,
  line: Coordinate[]
): number {
  if (!line || line.length === 0) return Infinity;
  if (line.length === 1) return haversineDistance(point, line[0]);

  let min = Infinity;
  for (let i = 0; i < line.length - 1; i++) {
    const d = pointToSegmentDistance(point, line[i], line[i + 1]);
    if (d < min) min = d;
  }
  return min;
}

export function calculateTotalDistance(points: Coordinate[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineDistance(points[i - 1], points[i]);
  }
  return total;
}

/** Estimate active travel time from a sequence of timed points. */
export function calculateDurationMs(points: Coordinate[]): number {
  if (points.length < 2) return 0;
  return points[points.length - 1].timestamp - points[0].timestamp;
}

export function calculateMaxSpeed(points: Coordinate[]): number {
  let max = 0;
  for (let i = 1; i < points.length; i++) {
    const dist = haversineDistance(points[i - 1], points[i]);
    const dt = (points[i].timestamp - points[i - 1].timestamp) / 1000;
    if (dt > 0) {
      const s = dist / dt;
      if (s > max) max = s;
    }
  }
  return max;
}

export function generateId(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
  );
}

export function validateCoordinate(coord: Coordinate): boolean {
  if (!coord) return false;
  if (typeof coord.latitude !== 'number' || typeof coord.longitude !== 'number') return false;
  if (isNaN(coord.latitude) || isNaN(coord.longitude)) return false;
  if (coord.latitude < -90 || coord.latitude > 90) return false;
  if (coord.longitude < -180 || coord.longitude > 180) return false;
  if (coord.accuracy !== undefined && (coord.accuracy < 0 || coord.accuracy > 500)) return false;
  if (coord.speed !== undefined && (coord.speed < -10 || coord.speed > 100)) return false;
  if (coord.timestamp <= 0) return false;
  return true;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

/**
 * Compute a map region (center + span deltas) that frames a set of
 * coordinates with a safety margin, handling the degenerate single-point /
 * zero-span cases.
 */
export function regionForCoordinates(
  coords: Coordinate[],
  paddingFactor = 0.18
): MapRegion | null {
  if (!coords || coords.length === 0) return null;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const c of coords) {
    if (c.latitude < minLat) minLat = c.latitude;
    if (c.latitude > maxLat) maxLat = c.latitude;
    if (c.longitude < minLng) minLng = c.longitude;
    if (c.longitude > maxLng) maxLng = c.longitude;
  }
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  let latDelta = (maxLat - minLat) * (1 + paddingFactor * 2);
  let lngDelta = (maxLng - minLng) * (1 + paddingFactor * 2);
  const minDelta = 0.0012; // ~130 m — enough for a short stroll
  if (latDelta < minDelta) latDelta = minDelta;
  if (lngDelta < minDelta) lngDelta = minDelta;
  return {
    latitude: centerLat,
    longitude: centerLng,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, '0');
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${minutes}:${pad(seconds)}`;
}

/** Average pace in seconds per km, or null if no meaningful distance. */
export function paceSecPerKm(distanceMeters: number, durationMs: number): number | null {
  const km = distanceMeters / 1000;
  if (km < 0.01 || durationMs <= 0) return null;
  return durationMs / 1000 / km;
}

export function formatPace(secPerKm: number | null): string {
  if (secPerKm === null || !isFinite(secPerKm)) return '--:--';
  const total = Math.round(secPerKm);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')} /km`;
}

/** Speed in km/h from distance (meters) and duration (milliseconds). */
export function formatSpeed(distanceMeters: number, durationMs: number): string {
  if (durationMs <= 0 || distanceMeters <= 0) return '0.0 km/h';
  const distanceKm = distanceMeters / 1000;
  const durationHours = durationMs / 3600000;
  const speedKmh = distanceKm / durationHours;
  if (!isFinite(speedKmh) || isNaN(speedKmh)) return '0.0 km/h';
  return `${speedKmh.toFixed(1)} km/h`;
}

// ── Movement-confidence helpers ────────────────────────────────────────────

/** Geographic centroid (mean lat/lng) of a set of coordinates. */
export function computeCentroid(coords: Coordinate[]): Coordinate {
  if (coords.length === 0) return { latitude: 0, longitude: 0, timestamp: 0 };
  let latSum = 0;
  let lngSum = 0;
  for (const c of coords) {
    latSum += c.latitude;
    lngSum += c.longitude;
  }
  return {
    latitude: latSum / coords.length,
    longitude: lngSum / coords.length,
    timestamp: coords[coords.length - 1].timestamp,
  };
}

/** Average haversine distance of points from a centroid. */
export function averageDistanceFromCentroid(
  coords: Coordinate[],
  center: Coordinate
): number {
  if (coords.length === 0) return 0;
  let total = 0;
  for (const c of coords) {
    total += haversineDistance(c, center);
  }
  return total / coords.length;
}

/** Maximum haversine distance of points from a centroid. */
export function maxDistanceFromCentroid(
  coords: Coordinate[],
  center: Coordinate
): number {
  let max = 0;
  for (const c of coords) {
    const d = haversineDistance(c, center);
    if (d > max) max = d;
  }
  return max;
}

/**
 * Direction consistency of consecutive displacements (0–1).
 *
 * 1 = all displacements point in the same direction (coherent walking).
 * 0 = displacements are randomly distributed (GPS noise / phone shake).
 *
 * Uses circular variance of displacement bearings.
 */
export function directionConsistency(coords: Coordinate[]): number {
  if (coords.length < 3) return 0;

  const directions: number[] = [];
  for (let i = 1; i < coords.length; i++) {
    const dist = haversineDistance(coords[i - 1], coords[i]);
    if (dist > 0.5) {
      directions.push(bearing(coords[i - 1], coords[i]));
    }
  }

  if (directions.length < 2) return 0;

  let sinSum = 0;
  let cosSum = 0;
  for (const d of directions) {
    sinSum += Math.sin(toRad(d));
    cosSum += Math.cos(toRad(d));
  }

  // R = resultant length / count: 1 = perfectly aligned, 0 = uniform random
  const R = Math.sqrt(sinSum * sinSum + cosSum * cosSum) / directions.length;
  return R;
}

/**
 * Compute a movement-confidence score (0–1) from recent GPS positions.
 *
 * 0 = definitely stationary (GPS noise / phone shake).
 * 1 = definitely moving (coherent translational displacement).
 *
 * Combines four signals:
 *   1. Position spread relative to accuracy  (is the GPS cloud tight?)
 *   2. Direction consistency                 (are displacements coherent?)
 *   3. GPS-reported speed                    (does the device think it's moving?)
 *   4. Position drift over time              (is the centroid shifting?)
 */
export function computeMovementConfidence(
  positions: Coordinate[],
  currentAccuracy: number,
  currentSpeed: number | undefined,
  isCalibrating: boolean
): number {
  if (positions.length < 3) return 0;
  if (isCalibrating) return 0;

  // ── Signal 1: Position spread relative to accuracy ──────────────────────
  // When stationary, GPS positions form a cloud with radius ≈ accuracy.
  // When moving, positions spread along the travel direction.
  const centroid = computeCentroid(positions);
  const avgSpread = averageDistanceFromCentroid(positions, centroid);
  const accuracy = Math.max(currentAccuracy, 1);
  const spreadRatio = avgSpread / accuracy;
  // Low spread relative to accuracy → stationary.
  // At spreadRatio < 0.35 the positions are well within the accuracy circle.
  // At spreadRatio > 0.8 they've spread beyond it — likely real movement.
  const spreadConfidence = clamp((spreadRatio - 0.35) / 0.55, 0, 1);

  // ── Signal 2: Direction consistency ─────────────────────────────────────
  const dirConsistency = directionConsistency(positions);

  // ── Signal 3: GPS-reported speed ────────────────────────────────────────
  let speedConfidence = 0;
  if (currentSpeed !== undefined && currentSpeed !== null && currentSpeed >= 0) {
    // 0 m/s → 0 confidence, 1.2 m/s (brisk walk) → ~1 confidence
    speedConfidence = clamp(currentSpeed / 1.2, 0, 1);
  }

  // ── Signal 4: Centroid drift over time ──────────────────────────────────
  // Compare the first half of the buffer to the second half.
  // If the centroid has moved, positions are drifting — likely real movement.
  let driftConfidence = 0;
  if (positions.length >= 6) {
    const mid = Math.floor(positions.length / 2);
    const firstHalf = positions.slice(0, mid);
    const secondHalf = positions.slice(mid);
    const c1 = computeCentroid(firstHalf);
    const c2 = computeCentroid(secondHalf);
    const centroidDrift = haversineDistance(c1, c2);
    // If the centroid drifted more than 1/3 of the accuracy, that's real movement
    driftConfidence = clamp((centroidDrift - accuracy * 0.3) / (accuracy * 0.5), 0, 1);
  }

  // ── Weighted combination ────────────────────────────────────────────────
  const confidence =
    0.28 * spreadConfidence +
    0.27 * dirConsistency +
    0.22 * speedConfidence +
    0.23 * driftConfidence;

  return clamp(confidence, 0, 1);
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

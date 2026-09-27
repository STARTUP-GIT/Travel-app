// Geo utilities - aligned with original Path-Tracker's geo.ts

const EARTH_RADIUS_M = 6371000;

export function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/** Great-circle distance between two points in meters (Haversine). */
export function haversineDistance(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
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
export function bearing(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
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

/** Circular mean of headings. */
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
 */
export function pointToSegmentDistance(
  point: { latitude: number; longitude: number },
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
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

/** Project a point onto line segment [a, b]. */
export function projectPointOnSegment(
  point: { latitude: number; longitude: number; timestamp?: number },
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): { projectedPoint: { latitude: number; longitude: number; timestamp?: number }; t: number; distanceMeters: number } {
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
  const projectedPoint: { latitude: number; longitude: number; timestamp?: number } = {
    latitude: projLat,
    longitude: projLng,
    timestamp: point.timestamp,
  };

  const distanceMeters = haversineDistance(point, projectedPoint);
  return { projectedPoint, t, distanceMeters };
}

/** Find nearest segment of a polyline corridor to a given point. */
export function findNearestSegmentAndProjection(
  point: { latitude: number; longitude: number },
  line: { latitude: number; longitude: number; timestamp?: number }[]
): { segmentIndex: number; projectedPoint: { latitude: number; longitude: number; timestamp?: number }; distanceMeters: number } | null {
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
  let bestProj: { latitude: number; longitude: number; timestamp?: number } = line[0];

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
 * Extract same-path return corridor from recorded path.
 */
export function extractSamePathReturnCorridor(
  recordedPath: { latitude: number; longitude: number; timestamp?: number }[],
  currentPosition: { latitude: number; longitude: number }
): {
  returnCorridor: { latitude: number; longitude: number; timestamp?: number }[];
  remainingDistance: number;
  projectedPoint: { latitude: number; longitude: number; timestamp?: number };
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
  const slicedForward: { latitude: number; longitude: number; timestamp?: number }[] = [];
  for (let i = 0; i <= segmentIndex; i++) {
    const pt = recordedPath[i];
    slicedForward.push({
      latitude: pt.latitude,
      longitude: pt.longitude,
      timestamp: pt.timestamp,
    });
  }
  slicedForward.push(projectedPoint);

  // Reverse so it starts at projectedPoint and ends at P0 (START)
  const returnCorridor = slicedForward.reverse();

  // Deduplicate very close points
  const cleanedCorridor: { latitude: number; longitude: number }[] = [returnCorridor[0]];
  for (let i = 1; i < returnCorridor.length; i++) {
    if (haversineDistance({
      latitude: cleanedCorridor[cleanedCorridor.length - 1].latitude,
      longitude: cleanedCorridor[cleanedCorridor.length - 1].longitude
    }, {
      latitude: returnCorridor[i].latitude,
      longitude: returnCorridor[i].longitude
    }) > 0.5) {
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
  point: { latitude: number; longitude: number },
  line: { latitude: number; longitude: number }[]
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

/** Cumulative distance along a path. */
export function calculateTotalDistance(points: { latitude: number; longitude: number }[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineDistance(points[i - 1], points[i]);
  }
  return total;
}

/** Estimate active travel time from a sequence of timed points. */
export function calculateDurationMs(points: { timestamp: number }[]): number {
  if (points.length < 2) return 0;
  return points[points.length - 1].timestamp - points[0].timestamp;
}

/** Maximum speed from a sequence of points. */
export function calculateMaxSpeed(points: { latitude: number; longitude: number; timestamp: number }[]): number {
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

/** Generate a unique ID. */
export function generateId(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
  );
}

/** Validate a coordinate. */
export function validateCoordinate(coord: { latitude: number; longitude: number; accuracy?: number; speed?: number; timestamp: number }): boolean {
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

/** Average pace in seconds per km. */
export function paceSecPerKm(distanceMeters: number, durationMs: number): number | null {
  const km = distanceMeters / 1000;
  if (km < 0.01 || durationMs <= 0) return null;
  return durationMs / 1000 / km;
}

/** Format distance in meters to string. */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

/** Format duration in ms to string. */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, '0');
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${minutes}:${pad(seconds)}`;
}

// Movement-confidence helpers

/** Geographic centroid (mean lat/lng) of a set of coordinates. */
export function computeCentroid(coords: { latitude: number; longitude: number; timestamp?: number }[]): { latitude: number; longitude: number; timestamp?: number } {
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
    timestamp: coords[coords.length - 1].timestamp ?? 0,
  };
}

/** Average haversine distance of points from a centroid. */
export function averageDistanceFromCentroid(
  coords: { latitude: number; longitude: number }[],
  center: { latitude: number; longitude: number }
): number {
  if (coords.length === 0) return 0;
  let total = 0;
  for (const c of coords) {
    total += haversineDistance(c, center);
  }
  return total / coords.length;
}

/**
 * Direction consistency of consecutive displacements (0-1).
 */
export function directionConsistency(coords: { latitude: number; longitude: number }[]): number {
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

  const R = Math.sqrt(sinSum * sinSum + cosSum * cosSum) / directions.length;
  return R;
}

/**
 * Compute a movement-confidence score (0-1) from recent GPS positions.
 */
export function computeMovementConfidence(
  positions: { latitude: number; longitude: number; accuracy?: number; speed?: number | undefined; timestamp: number }[],
  currentAccuracy: number,
  currentSpeed: number | undefined,
  isCalibrating: boolean
): number {
  if (positions.length < 3) return 0;
  if (isCalibrating) return 0;

  // Signal 1: Position spread relative to accuracy
  const centroid = computeCentroid(positions);
  const avgSpread = averageDistanceFromCentroid(positions, centroid);
  const accuracy = Math.max(currentAccuracy, 1);
  const spreadRatio = avgSpread / accuracy;
  const spreadConfidence = clamp((spreadRatio - 0.35) / 0.55, 0, 1);

  // Signal 2: Direction consistency
  const dirConsistency = directionConsistency(positions);

  // Signal 3: GPS-reported speed
  let speedConfidence = 0;
  if (currentSpeed !== undefined && currentSpeed !== null && currentSpeed >= 0) {
    speedConfidence = clamp(currentSpeed / 1.2, 0, 1);
  }

  // Signal 4: Centroid drift over time
  let driftConfidence = 0;
  if (positions.length >= 6) {
    const mid = Math.floor(positions.length / 2);
    const firstHalf = positions.slice(0, mid);
    const secondHalf = positions.slice(mid);
    const c1 = computeCentroid(firstHalf);
    const c2 = computeCentroid(secondHalf);
    const centroidDrift = haversineDistance(c1, c2);
    driftConfidence = clamp((centroidDrift - accuracy * 0.3) / (accuracy * 0.5), 0, 1);
  }

  // Weighted combination
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

// Web fallback database using localStorage (in-memory + persisted JSON).
// Native uses the SQLite implementation in database-service.ts.
import { Trip, TripState, TripSummary, Checkpoint } from '../types';
import { Branding } from '../constants/theme';

const KEY = Branding.databaseName;

interface Stored {
  trips: Record<string, Trip>;
  points: Record<string, Trip['points']>;
  checkpoints: Record<string, Checkpoint[]>;
}

function read(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed.checkpoints) parsed.checkpoints = {};
      return parsed;
    }
  } catch {
    // ignore
  }
  return { trips: {}, points: {}, checkpoints: {} };
}

function write(data: Stored): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // storage may be full; ignore for web fallback
  }
}

export async function createTrip(trip: Trip): Promise<void> {
  const data = read();
  data.trips[trip.id] = trip;
  data.points[trip.id] = climbPoints(trip.points);
  write(data);
}

function climbPoints(pts: Trip['points']): Trip['points'] {
  return pts.map((p) => ({ ...p }));
}

export async function appendPoints(
  tripId: string,
  points: { index: number; latitude: number; longitude: number; altitude?: number; accuracy?: number; heading?: number; speed?: number; timestamp: number }[]
): Promise<void> {
  if (points.length === 0) return;
  const data = read();
  if (!data.points[tripId]) data.points[tripId] = [];
  const existing = data.points[tripId];
  const maxIndex = existing.reduce((m, p) => (p.index > m ? p.index : m), -1);
  const fresh = points.filter((p) => p.index > maxIndex);
  for (const p of fresh) existing.push({ ...p });
  write(data);
}

export async function updateTripMeta(trip: Trip): Promise<void> {
  const data = read();
  if (data.trips[trip.id]) {
    data.trips[trip.id] = { ...trip };
  }
  write(data);
}

export async function loadTrip(id: string): Promise<Trip | null> {
  const data = read();
  const trip = data.trips[id];
  if (!trip) return null;
  return { ...trip, points: data.points[id] ?? [] };
}

export async function loadActiveTrip(): Promise<Trip | null> {
  const data = read();
  const ids = Object.keys(data.trips).sort(
    (a, b) => data.trips[b].startTime - data.trips[a].startTime
  );
  for (const id of ids) {
    const t = data.trips[id];
    if (t.state === 'ACTIVE' || t.state === 'PAUSED' || t.state === 'RETURNING') {
      return { ...t, points: data.points[id] ?? [] };
    }
  }
  return null;
}

export async function loadTripSummaries(): Promise<TripSummary[]> {
  const data = read();
  return Object.values(data.trips)
    .map((t) => ({
      id: t.id,
      startTime: t.startTime,
      endTime: t.endTime,
      totalDistance: t.totalDistance,
      activeDurationMs: t.activeDurationMs,
      state: t.state as TripState,
      pointCount: (data.points[t.id] ?? []).length,
      returnedToStart: t.returnedToStart,
    }))
    .sort((a, b) => b.startTime - a.startTime);
}

export async function deleteTrip(id: string): Promise<void> {
  const data = read();
  delete data.trips[id];
  delete data.points[id];
  delete data.checkpoints[id];
  write(data);
}

export async function getPointCount(tripId: string): Promise<number> {
  const data = read();
  return (data.points[tripId] ?? []).length;
}

// ── Checkpoints ────────────────────────────────────────────────────────────

export async function saveCheckpoint(cp: Checkpoint): Promise<void> {
  const data = read();
  if (!data.checkpoints[cp.tripId]) data.checkpoints[cp.tripId] = [];
  const existing = data.checkpoints[cp.tripId];
  const idx = existing.findIndex((c) => c.checkpointId === cp.checkpointId);
  if (idx >= 0) {
    existing[idx] = cp;
  } else {
    existing.push(cp);
  }
  existing.sort((a, b) => a.checkpointNumber - b.checkpointNumber);
  write(data);
}

export async function loadCheckpoints(tripId: string): Promise<Checkpoint[]> {
  const data = read();
  return (data.checkpoints[tripId] ?? []).sort(
    (a, b) => a.checkpointNumber - b.checkpointNumber
  );
}

export async function deleteCheckpoints(tripId: string): Promise<void> {
  const data = read();
  delete data.checkpoints[tripId];
  write(data);
}

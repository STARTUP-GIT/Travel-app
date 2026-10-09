// Device-local persistence for Path Tracker on React Native (AsyncStorage backend).
import { storage, KEYS } from '@/lib/storage/local-store';
import { Trip, TripState, TripSummary, Checkpoint } from './types';

const CHECKPOINTS_KEY = 'kt-path-tracker-checkpoints' as const;

interface StoredData {
  trips: Record<string, Trip>;
  points: Record<string, Trip['points']>;
}

interface StoredCheckpoints {
  checkpoints: Record<string, Checkpoint[]>;
}

async function readStore(): Promise<StoredData> {
  const rawTrips = await storage.readJson<Record<string, Trip>>(KEYS.trips, {});
  const rawState = await storage.readJson<Trip | null>(KEYS.trackerState, null);
  const data: StoredData = { trips: {}, points: {} };

  if (rawTrips && typeof rawTrips === 'object' && !Array.isArray(rawTrips)) {
    for (const [id, t] of Object.entries(rawTrips)) {
      if (t && t.id) {
        data.trips[id] = t;
        data.points[id] = t.points ?? [];
      }
    }
  } else if (Array.isArray(rawTrips)) {
    // Legacy array format fallback
    for (const item of rawTrips as any[]) {
      if (item && item.id) {
        data.trips[item.id] = item;
        data.points[item.id] = item.points ?? [];
      }
    }
  }

  if (rawState && rawState.id) {
    data.trips[rawState.id] = rawState;
    data.points[rawState.id] = rawState.points ?? [];
  }

  return data;
}

async function writeStore(data: StoredData): Promise<void> {
  await storage.writeJson(KEYS.trips, data.trips);
}

async function readCheckpoints(): Promise<StoredCheckpoints> {
  return await storage.readJson<StoredCheckpoints>(CHECKPOINTS_KEY as any, { checkpoints: {} });
}

async function writeCheckpoints(data: StoredCheckpoints): Promise<void> {
  await storage.writeJson(CHECKPOINTS_KEY as any, data);
}

export async function createTrip(trip: Trip): Promise<void> {
  const data = await readStore();
  data.trips[trip.id] = { ...trip, points: [...trip.points] };
  data.points[trip.id] = [...trip.points];
  await writeStore(data);
  await storage.writeJson(KEYS.trackerState, trip);
}

export async function appendPoints(
  tripId: string,
  points: { index: number; latitude: number; longitude: number; altitude?: number; accuracy?: number; heading?: number; speed?: number; timestamp: number }[]
): Promise<void> {
  if (points.length === 0) return;
  const data = await readStore();
  const existing = data.points[tripId] ?? [];
  const maxIndex = existing.reduce((m, p) => (p.index > m ? p.index : m), -1);
  const fresh = points.filter((p) => p.index > maxIndex);
  if (fresh.length === 0) return;

  const updatedPoints = [...existing, ...fresh];
  data.points[tripId] = updatedPoints;
  if (data.trips[tripId]) {
    data.trips[tripId].points = updatedPoints;
  }
  await writeStore(data);

  const active = await storage.readJson<Trip | null>(KEYS.trackerState, null);
  if (active && active.id === tripId) {
    active.points = updatedPoints;
    await storage.writeJson(KEYS.trackerState, active);
  }
}

export async function updateTripMeta(trip: Trip): Promise<void> {
  const data = await readStore();
  data.trips[trip.id] = { ...trip, points: data.points[trip.id] ?? trip.points };
  await writeStore(data);

  if (trip.state === 'ACTIVE' || trip.state === 'PAUSED' || trip.state === 'RETURNING') {
    await storage.writeJson(KEYS.trackerState, trip);
  } else if (trip.state === 'COMPLETED') {
    await storage.remove(KEYS.trackerState);
  }
}

export async function loadTrip(id: string): Promise<Trip | null> {
  const data = await readStore();
  const trip = data.trips[id];
  if (!trip) return null;
  return { ...trip, points: data.points[id] ?? [] };
}

export async function loadActiveTrip(): Promise<Trip | null> {
  const active = await storage.readJson<Trip | null>(KEYS.trackerState, null);
  if (active && (active.state === 'ACTIVE' || active.state === 'PAUSED' || active.state === 'RETURNING')) {
    return active;
  }
  const data = await readStore();
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
  const data = await readStore();
  return Object.values(data.trips)
    .filter((t) => t.state === 'COMPLETED' || t.endTime)
    .map((t) => ({
      id: t.id,
      startTime: t.startTime,
      endTime: t.endTime,
      totalDistance: t.totalDistance,
      activeDurationMs: t.activeDurationMs,
      state: t.state as TripState,
      pointCount: (data.points[t.id] ?? t.points ?? []).length,
      returnedToStart: t.returnedToStart,
    }))
    .sort((a, b) => b.startTime - a.startTime);
}

export async function deleteTrip(id: string): Promise<void> {
  const data = await readStore();
  delete data.trips[id];
  delete data.points[id];
  await writeStore(data);

  const active = await storage.readJson<Trip | null>(KEYS.trackerState, null);
  if (active && active.id === id) {
    await storage.remove(KEYS.trackerState);
  }

  await deleteCheckpoints(id);
}

export async function getPointCount(tripId: string): Promise<number> {
  const data = await readStore();
  return (data.points[tripId] ?? []).length;
}

// ── Checkpoints Persistence ──────────────────────────────────────────────────

export async function saveCheckpoint(cp: Checkpoint): Promise<void> {
  const data = await readCheckpoints();
  if (!data.checkpoints[cp.tripId]) data.checkpoints[cp.tripId] = [];
  const existing = data.checkpoints[cp.tripId];
  const idx = existing.findIndex((c) => c.checkpointId === cp.checkpointId);
  if (idx >= 0) {
    existing[idx] = cp;
  } else {
    existing.push(cp);
  }
  existing.sort((a, b) => a.checkpointNumber - b.checkpointNumber);
  await writeCheckpoints(data);
}

export async function loadCheckpoints(tripId: string): Promise<Checkpoint[]> {
  const data = await readCheckpoints();
  return (data.checkpoints[tripId] ?? []).sort(
    (a, b) => a.checkpointNumber - b.checkpointNumber
  );
}

export async function deleteCheckpoints(tripId: string): Promise<void> {
  const data = await readCheckpoints();
  delete data.checkpoints[tripId];
  await writeCheckpoints(data);
}

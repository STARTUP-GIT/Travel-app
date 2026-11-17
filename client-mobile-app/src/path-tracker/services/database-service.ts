import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireOptionalNativeModule } from 'expo';
import {
  Trip,
  TripState,
  TripSummary,
  Checkpoint,
} from '../types';
import { Branding } from '../constants/theme';

const DB_NAME = Branding.databaseName;

type ExpoSQLite = typeof import('expo-sqlite');

let SQLiteModule: ExpoSQLite | null = null;
let sqliteChecked = false;

function getSQLite(): ExpoSQLite | null {
  if (sqliteChecked) return SQLiteModule;
  sqliteChecked = true;
  try {
    const native = typeof requireOptionalNativeModule === 'function'
      ? requireOptionalNativeModule('ExpoSQLite')
      : null;
    if (!native) {
      SQLiteModule = null;
      useFallbackStorage = true;
      return null;
    }
    const mod = require('expo-sqlite');
    if (mod && (typeof mod.openDatabaseAsync === 'function' || typeof mod.default?.openDatabaseAsync === 'function')) {
      SQLiteModule = mod;
    }
  } catch {
    SQLiteModule = null;
    useFallbackStorage = true;
  }
  return SQLiteModule;
}

interface SQLiteDatabaseLike {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: any[]): Promise<any>;
  getFirstAsync<T = any>(sql: string, params?: any[]): Promise<T | null>;
  getAllAsync<T = any>(sql: string, params?: any[]): Promise<T[]>;
  withTransactionAsync(cb: () => Promise<void>): Promise<void>;
}

let db: SQLiteDatabaseLike | null = null;
let useFallbackStorage = false;

// Fallback in-memory storage persisted via AsyncStorage (for Expo Go or when native SQLite is absent)
interface FallbackData {
  trips: Record<string, Trip>;
  points: Record<string, Trip['points']>;
  checkpoints: Record<string, Checkpoint[]>;
}

const fallbackData: FallbackData = {
  trips: {},
  points: {},
  checkpoints: {},
};
let fallbackLoaded = false;
const FALLBACK_KEY = Branding.databaseName;

async function loadFallbackData(): Promise<FallbackData> {
  if (fallbackLoaded) return fallbackData;
  try {
    const raw = await AsyncStorage.getItem(FALLBACK_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.trips) fallbackData.trips = parsed.trips;
      if (parsed.points) fallbackData.points = parsed.points;
      if (parsed.checkpoints) fallbackData.checkpoints = parsed.checkpoints;
    }
  } catch {
    // ignore
  }
  fallbackLoaded = true;
  return fallbackData;
}

async function persistFallbackData(): Promise<void> {
  try {
    await AsyncStorage.setItem(FALLBACK_KEY, JSON.stringify(fallbackData));
  } catch {
    // ignore
  }
}

export async function getDatabase(): Promise<SQLiteDatabaseLike | null> {
  if (useFallbackStorage) return null;
  if (db) return db;

  const SQLite = getSQLite();
  if (!SQLite) {
    useFallbackStorage = true;
    await loadFallbackData();
    return null;
  }

  try {
    const openFn = SQLite.openDatabaseAsync || (SQLite as any).default?.openDatabaseAsync;
    db = (await openFn(DB_NAME)) as SQLiteDatabaseLike;
    await initDatabase(db);
    return db;
  } catch {
    useFallbackStorage = true;
    await loadFallbackData();
    return null;
  }
}

async function initDatabase(database: SQLiteDatabaseLike): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      startTime INTEGER NOT NULL,
      endTime INTEGER,
      totalDistance REAL NOT NULL DEFAULT 0,
      activeDurationMs INTEGER NOT NULL DEFAULT 0,
      state TEXT NOT NULL DEFAULT 'IDLE',
      avgSpeed REAL,
      avgPaceSecPerKm REAL,
      maxSpeed REAL,
      returnedToStart INTEGER,
      outboundPointCount INTEGER
    );

    CREATE TABLE IF NOT EXISTS trip_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tripId TEXT NOT NULL,
      indexNum INTEGER NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      altitude REAL,
      accuracy REAL,
      heading REAL,
      speed REAL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (tripId) REFERENCES trips(id)
    );

    CREATE INDEX IF NOT EXISTS idx_points_trip ON trip_points(tripId);

    CREATE TABLE IF NOT EXISTS checkpoints (
      id TEXT PRIMARY KEY,
      tripId TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      timestamp INTEGER NOT NULL,
      checkpointNumber INTEGER NOT NULL,
      FOREIGN KEY (tripId) REFERENCES trips(id)
    );
    CREATE INDEX IF NOT EXISTS idx_checkpoints_trip ON checkpoints(tripId);
  `);

  // Migration: add outboundPointCount column if missing (existing DBs)
  try {
    await database.execAsync(
      `ALTER TABLE trips ADD COLUMN outboundPointCount INTEGER`
    );
  } catch {
    // Column already exists — safe to ignore.
  }
}

interface TripRow {
  id: string;
  startTime: number;
  endTime: number | null;
  totalDistance: number;
  activeDurationMs: number;
  state: string;
  avgSpeed: number | null;
  avgPaceSecPerKm: number | null;
  maxSpeed: number | null;
  returnedToStart: number | null;
  outboundPointCount: number | null;
}

interface PointRow {
  indexNum: number;
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

type TripPointRow = PointRow & { indexNum: number };

function mapTrip(row: TripRow, points: TripPointRow[]): Trip {
  return {
    id: row.id,
    startTime: row.startTime,
    endTime: row.endTime ?? undefined,
    totalDistance: row.totalDistance,
    activeDurationMs: row.activeDurationMs,
    state: row.state as TripState,
    avgSpeed: row.avgSpeed ?? undefined,
    avgPaceSecPerKm: row.avgPaceSecPerKm ?? undefined,
    maxSpeed: row.maxSpeed ?? undefined,
    returnedToStart: row.returnedToStart === 1,
    outboundPointCount: row.outboundPointCount ?? undefined,
    points: points.map((p) => ({
      index: p.indexNum,
      latitude: p.latitude,
      longitude: p.longitude,
      altitude: p.altitude ?? undefined,
      accuracy: p.accuracy ?? undefined,
      heading: p.heading ?? undefined,
      speed: p.speed ?? undefined,
      timestamp: p.timestamp,
    })),
  };
}

export async function createTrip(trip: Trip): Promise<void> {
  const database = await getDatabase();
  if (useFallbackStorage || !database) {
    await loadFallbackData();
    fallbackData.trips[trip.id] = { ...trip };
    fallbackData.points[trip.id] = (trip.points || []).map((p) => ({ ...p }));
    await persistFallbackData();
    return;
  }

  await database.runAsync(
    `INSERT OR REPLACE INTO trips
       (id, startTime, endTime, totalDistance, activeDurationMs, state, returnedToStart, outboundPointCount)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      trip.id,
      trip.startTime,
      trip.endTime ?? null,
      trip.totalDistance,
      trip.activeDurationMs,
      trip.state,
      trip.returnedToStart ? 1 : null,
      trip.outboundPointCount ?? null,
    ]
  );
}

/**
 * Insert a batch of points efficiently in a single transaction.
 * Skips points whose index already exists in the DB (idempotent).
 */
export async function appendPoints(
  tripId: string,
  points: { index: number; latitude: number; longitude: number; altitude?: number; accuracy?: number; heading?: number; speed?: number; timestamp: number }[]
): Promise<void> {
  if (points.length === 0) return;
  const database = await getDatabase();
  if (useFallbackStorage || !database) {
    await loadFallbackData();
    if (!fallbackData.points[tripId]) fallbackData.points[tripId] = [];
    const existing = fallbackData.points[tripId];
    const maxIndex = existing.reduce((m, p) => (p.index > m ? p.index : m), -1);
    const fresh = points.filter((p) => p.index > maxIndex);
    for (const p of fresh) existing.push({ ...p });
    await persistFallbackData();
    return;
  }

  // Determine highest existing index to avoid duplicates.
  const maxRow = await database.getFirstAsync<{ m: number | null }>(
    'SELECT MAX(indexNum) as m FROM trip_points WHERE tripId = ?',
    [tripId]
  );
  const startFrom = (maxRow?.m ?? -1) + 1;
  const newPoints = points.filter((p) => p.index >= startFrom);
  if (newPoints.length === 0) return;

  await database.withTransactionAsync(async () => {
    for (const p of newPoints) {
      await database.runAsync(
        `INSERT OR IGNORE INTO trip_points
           (tripId, indexNum, latitude, longitude, altitude, accuracy, heading, speed, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [tripId, p.index, p.latitude, p.longitude, p.altitude ?? null, p.accuracy ?? null, p.heading ?? null, p.speed ?? null, p.timestamp]
      );
    }
  });
}

export async function updateTripMeta(trip: Trip): Promise<void> {
  const database = await getDatabase();
  if (useFallbackStorage || !database) {
    await loadFallbackData();
    if (fallbackData.trips[trip.id]) {
      fallbackData.trips[trip.id] = { ...trip };
      await persistFallbackData();
    }
    return;
  }

  await database.runAsync(
    `UPDATE trips SET
       endTime = ?, totalDistance = ?, activeDurationMs = ?,
       state = ?, avgSpeed = ?, avgPaceSecPerKm = ?, maxSpeed = ?,
       returnedToStart = ?, outboundPointCount = ?
     WHERE id = ?`,
    [
      trip.endTime ?? null,
      trip.totalDistance,
      trip.activeDurationMs,
      trip.state,
      trip.avgSpeed ?? null,
      trip.avgPaceSecPerKm ?? null,
      trip.maxSpeed ?? null,
      trip.returnedToStart ? 1 : null,
      trip.outboundPointCount ?? null,
      trip.id,
    ]
  );
}

export async function loadTrip(id: string): Promise<Trip | null> {
  const database = await getDatabase();
  if (useFallbackStorage || !database) {
    await loadFallbackData();
    const trip = fallbackData.trips[id];
    if (!trip) return null;
    return { ...trip, points: fallbackData.points[id] ?? [] };
  }

  const row = await database.getFirstAsync<TripRow>(
    'SELECT * FROM trips WHERE id = ?',
    [id]
  );
  if (!row) return null;
  const points = await database.getAllAsync<PointRow & { indexNum: number }>(
    'SELECT * FROM trip_points WHERE tripId = ? ORDER BY indexNum',
    [id]
  );
  return mapTrip(row, points);
}

/** Find any trip that is still active (recording/paused/returning/arrived) for recovery. */
export async function loadActiveTrip(): Promise<Trip | null> {
  const database = await getDatabase();
  if (useFallbackStorage || !database) {
    await loadFallbackData();
    const ids = Object.keys(fallbackData.trips).sort(
      (a, b) => fallbackData.trips[b].startTime - fallbackData.trips[a].startTime
    );
    for (const id of ids) {
      const t = fallbackData.trips[id];
      if (t.state === 'ACTIVE' || t.state === 'PAUSED' || t.state === 'RETURNING' || t.state === 'ARRIVED') {
        return { ...t, points: fallbackData.points[id] ?? [] };
      }
    }
    return null;
  }

  const row = await database.getFirstAsync<TripRow>(
    `SELECT * FROM trips WHERE state IN ('ACTIVE','PAUSED','RETURNING','ARRIVED') ORDER BY startTime DESC LIMIT 1`
  );
  if (!row) return null;
  const points = await database.getAllAsync<PointRow & { indexNum: number }>(
    'SELECT * FROM trip_points WHERE tripId = ? ORDER BY indexNum',
    [row.id]
  );
  return mapTrip(row, points);
}

export async function loadTripSummaries(): Promise<TripSummary[]> {
  const database = await getDatabase();
  if (useFallbackStorage || !database) {
    await loadFallbackData();
    return Object.values(fallbackData.trips)
      .map((t) => ({
        id: t.id,
        startTime: t.startTime,
        endTime: t.endTime,
        totalDistance: t.totalDistance,
        activeDurationMs: t.activeDurationMs,
        state: t.state as TripState,
        pointCount: (fallbackData.points[t.id] ?? []).length,
        returnedToStart: t.returnedToStart,
      }))
      .sort((a, b) => b.startTime - a.startTime);
  }

  const rows = await database.getAllAsync<TripRow & { pointCount: number }>(
    `SELECT t.*, (SELECT COUNT(*) FROM trip_points p WHERE p.tripId = t.id) as pointCount
     FROM trips t ORDER BY t.startTime DESC`
  );
  return rows.map((r) => ({
    id: r.id,
    startTime: r.startTime,
    endTime: r.endTime ?? undefined,
    totalDistance: r.totalDistance,
    activeDurationMs: r.activeDurationMs,
    state: r.state as TripState,
    pointCount: r.pointCount,
    returnedToStart: r.returnedToStart === 1,
  }));
}

export async function deleteTrip(id: string): Promise<void> {
  const database = await getDatabase();
  if (useFallbackStorage || !database) {
    await loadFallbackData();
    delete fallbackData.trips[id];
    delete fallbackData.points[id];
    delete fallbackData.checkpoints[id];
    await persistFallbackData();
    return;
  }

  await database.runAsync('DELETE FROM trip_points WHERE tripId = ?', [id]);
  await database.runAsync('DELETE FROM checkpoints WHERE tripId = ?', [id]);
  await database.runAsync('DELETE FROM trips WHERE id = ?', [id]);
}

export async function getPointCount(tripId: string): Promise<number> {
  const database = await getDatabase();
  if (useFallbackStorage || !database) {
    await loadFallbackData();
    return (fallbackData.points[tripId] ?? []).length;
  }

  const row = await database.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) as c FROM trip_points WHERE tripId = ?',
    [tripId]
  );
  return row?.c ?? 0;
}

// ── Checkpoints ────────────────────────────────────────────────────────────

export async function saveCheckpoint(cp: Checkpoint): Promise<void> {
  const database = await getDatabase();
  if (useFallbackStorage || !database) {
    await loadFallbackData();
    if (!fallbackData.checkpoints[cp.tripId]) fallbackData.checkpoints[cp.tripId] = [];
    const existing = fallbackData.checkpoints[cp.tripId];
    const idx = existing.findIndex((c) => c.checkpointId === cp.checkpointId);
    if (idx >= 0) {
      existing[idx] = cp;
    } else {
      existing.push(cp);
    }
    existing.sort((a, b) => a.checkpointNumber - b.checkpointNumber);
    await persistFallbackData();
    return;
  }

  await database.runAsync(
    `INSERT OR REPLACE INTO checkpoints (id, tripId, latitude, longitude, timestamp, checkpointNumber)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [cp.checkpointId, cp.tripId, cp.latitude, cp.longitude, cp.timestamp, cp.checkpointNumber]
  );
}

export async function loadCheckpoints(tripId: string): Promise<Checkpoint[]> {
  const database = await getDatabase();
  if (useFallbackStorage || !database) {
    await loadFallbackData();
    return (fallbackData.checkpoints[tripId] ?? []).sort(
      (a, b) => a.checkpointNumber - b.checkpointNumber
    );
  }

  const rows = await database.getAllAsync<{
    id: string;
    tripId: string;
    latitude: number;
    longitude: number;
    timestamp: number;
    checkpointNumber: number;
  }>(
    'SELECT * FROM checkpoints WHERE tripId = ? ORDER BY checkpointNumber',
    [tripId]
  );
  return rows.map((r) => ({
    checkpointId: r.id,
    tripId: r.tripId,
    latitude: r.latitude,
    longitude: r.longitude,
    timestamp: r.timestamp,
    checkpointNumber: r.checkpointNumber,
  }));
}

export async function deleteCheckpoints(tripId: string): Promise<void> {
  const database = await getDatabase();
  if (useFallbackStorage || !database) {
    await loadFallbackData();
    delete fallbackData.checkpoints[tripId];
    await persistFallbackData();
    return;
  }

  await database.runAsync('DELETE FROM checkpoints WHERE tripId = ?', [tripId]);
}

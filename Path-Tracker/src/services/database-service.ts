import * as SQLite from 'expo-sqlite';
import {
  Trip,
  TripState,
  TripSummary,
  Checkpoint,
} from '../types';
import { Branding } from '../constants/theme';

const DB_NAME = Branding.databaseName;

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync(DB_NAME);
  await initDatabase(db);
  return db;
}

async function initDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
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
export async function appendPoints(tripId: string, points: { index: number; latitude: number; longitude: number; altitude?: number; accuracy?: number; heading?: number; speed?: number; timestamp: number }[]): Promise<void> {
  if (points.length === 0) return;
  const database = await getDatabase();

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
  await database.runAsync('DELETE FROM trip_points WHERE tripId = ?', [id]);
  await database.runAsync('DELETE FROM checkpoints WHERE tripId = ?', [id]);
  await database.runAsync('DELETE FROM trips WHERE id = ?', [id]);
}

export async function getPointCount(tripId: string): Promise<number> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) as c FROM trip_points WHERE tripId = ?',
    [tripId]
  );
  return row?.c ?? 0;
}

// ── Checkpoints ────────────────────────────────────────────────────────────

export async function saveCheckpoint(cp: Checkpoint): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO checkpoints (id, tripId, latitude, longitude, timestamp, checkpointNumber)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [cp.checkpointId, cp.tripId, cp.latitude, cp.longitude, cp.timestamp, cp.checkpointNumber]
  );
}

export async function loadCheckpoints(tripId: string): Promise<Checkpoint[]> {
  const database = await getDatabase();
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
  await database.runAsync('DELETE FROM checkpoints WHERE tripId = ?', [tripId]);
}

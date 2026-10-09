import { create } from 'zustand';
import {
  Coordinate,
  GPSState,
  MovementState,
  NetworkState,
  Trip,
  TripState,
  TripStats,
  TripSummary,
  ReturnState,
  Checkpoint,
} from './types';
import { tripEngine } from './trip-service';
import {
  loadTripSummaries,
  deleteTrip as dbDelete,
  loadTrip as dbLoad,
  loadActiveTrip as dbLoadActive,
  saveCheckpoint as dbSaveCheckpoint,
  loadCheckpoints as dbLoadCheckpoints,
} from './database-service';
import { getCurrentLocation } from './location-service';
import { generateId } from './geo';

const EMPTY_STATS: TripStats = {
  distance: 0,
  activeDurationMs: 0,
  avgSpeed: 0,
  avgPaceSecPerKm: 0,
  maxSpeed: 0,
  pointCount: 0,
};

const EMPTY_RETURN: ReturnState = {
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

interface TripStoreState {
  state: TripState;
  currentPosition: Coordinate | null;
  acceptedPosition: Coordinate | null;
  gpsAccuracy: number;
  pointCount: number;
  stats: TripStats;
  returnState: ReturnState;
  movementState: MovementState;
  movementConfidence: number;
  positionSpreadM: number;
  isCalibrating: boolean;

  networkState: NetworkState;
  gpsState: GPSState;
  isGPSActive: boolean;
  hasInitialPosition: boolean;
  isFollowing: boolean;

  activeTrip: Trip | null;
  tripHistory: TripSummary[];
  lastCompletedTrip: Trip | null;
  activeCheckpoints: Checkpoint[];

  bootstrapped: boolean;
  recoveredActive: Trip | null;

  bootstrap: () => Promise<void>;
  startTrip: () => Promise<void>;
  pauseTrip: () => void;
  resumeTrip: () => void;
  endTrip: () => Promise<Trip | null>;
  returnToStart: () => Promise<boolean>;
  cancelReturn: () => void;

  setNetwork: (n: NetworkState) => void;
  setGPSActive: (a: boolean) => void;
  setGpsState: (g: GPSState) => void;
  setCurrentPosition: (c: Coordinate) => void;
  setHasInitialPosition: (h: boolean) => void;
  setFollowing: (f: boolean) => void;
  requestRecenter: () => void;
  onMapDragged: () => void;

  setLastCompletedTrip: (t: Trip | null) => void;
  loadHistory: () => Promise<void>;
  loadTrip: (id: string) => Promise<Trip | null>;
  deleteTrip: (id: string) => Promise<void>;
  resumeRecoveredTrip: (trip: Trip) => Promise<void>;
  discardRecoveredTrip: () => Promise<void>;
  addCheckpoint: () => Promise<void>;
  loadCheckpoints: (tripId: string) => Promise<Checkpoint[]>;
}

export const useTripStore = create<TripStoreState>((set, get) => {
  tripEngine.subscribe((snap) => {
    set({
      state: snap.state,
      currentPosition: snap.currentPosition,
      acceptedPosition: snap.acceptedPosition,
      gpsAccuracy: snap.gpsAccuracy,
      pointCount: snap.pointCount,
      stats: snap.stats,
      returnState: snap.returnState,
      activeTrip: snap.trip,
      movementState: snap.movementState,
      movementConfidence: snap.movementConfidence,
      positionSpreadM: snap.positionSpreadM,
      isCalibrating: snap.isCalibrating,
      hasInitialPosition: snap.currentPosition !== null,
    });
  });

  return {
    state: 'IDLE',
    currentPosition: null,
    acceptedPosition: null,
    gpsAccuracy: 999,
    pointCount: 0,
    stats: EMPTY_STATS,
    returnState: EMPTY_RETURN,
    movementState: 'STATIONARY',
    movementConfidence: 0,
    positionSpreadM: 0,
    isCalibrating: true,

    networkState: 'unknown',
    gpsState: 'searching',
    isGPSActive: false,
    hasInitialPosition: false,
    isFollowing: true,

    activeTrip: null,
    tripHistory: [],
    lastCompletedTrip: null,
    activeCheckpoints: [],

    bootstrapped: false,
    recoveredActive: null,

    bootstrap: async () => {
      const active = await dbLoadActive();
      set({
        bootstrapped: true,
        recoveredActive: active,
      });
      if (active) {
        const cps = await dbLoadCheckpoints(active.id);
        set({ activeCheckpoints: cps });
      }
    },

    startTrip: async () => {
      set({ lastCompletedTrip: null, isFollowing: true, activeCheckpoints: [] });
      await tripEngine.createTrip();
      get().loadHistory();
    },

    pauseTrip: () => tripEngine.pause(),
    resumeTrip: () => tripEngine.resume(),

    endTrip: async () => {
      const finalFix = await getCurrentLocation();
      if (finalFix) {
        tripEngine.setCurrentPosition(finalFix);
        await tripEngine.ingestFix(finalFix).catch(() => {});
      }
      const completed = await tripEngine.endTrip();
      if (completed) set({ lastCompletedTrip: completed });
      get().loadHistory();
      return completed;
    },

    returnToStart: async () => tripEngine.returnToStart(),
    cancelReturn: () => tripEngine.cancelReturn(),

    setNetwork: (n) => set({ networkState: n }),
    setGPSActive: (a) => set({ isGPSActive: a }),
    setGpsState: (g) => set({ gpsState: g }),
    setCurrentPosition: (c) => {
      set({
        currentPosition: c,
        gpsAccuracy: c.accuracy ?? 999,
        hasInitialPosition: true,
        isGPSActive: true,
        gpsState: 'available',
      });
      tripEngine.setCurrentPosition(c);
      tripEngine.ingestFix(c).catch(() => {});
    },
    setHasInitialPosition: (h) => set({ hasInitialPosition: h }),
    setFollowing: (f) => set({ isFollowing: f }),
    requestRecenter: () => set({ isFollowing: true }),
    onMapDragged: () => set({ isFollowing: false }),

    setLastCompletedTrip: (t) => set({ lastCompletedTrip: t }),

    loadHistory: async () => {
      const summaries = await loadTripSummaries();
      set({ tripHistory: summaries });
    },

    loadTrip: async (id) => dbLoad(id),

    deleteTrip: async (id) => {
      await dbDelete(id);
      get().loadHistory();
    },

    resumeRecoveredTrip: async (trip) => {
      await tripEngine.recoverTrip(trip);
      const cps = await dbLoadCheckpoints(trip.id);
      set({ recoveredActive: null, isFollowing: true, activeCheckpoints: cps });
      get().loadHistory();
    },

    discardRecoveredTrip: async () => {
      if (get().recoveredActive) {
        await dbDelete(get().recoveredActive!.id);
      }
      set({ recoveredActive: null });
      get().loadHistory();
    },

    addCheckpoint: async () => {
      const pos = get().acceptedPosition ?? get().currentPosition;
      const trip = get().activeTrip;
      if (!pos || !trip) return;
      const cp: Checkpoint = {
        checkpointId: generateId(),
        tripId: trip.id,
        latitude: pos.latitude,
        longitude: pos.longitude,
        timestamp: Date.now(),
        checkpointNumber: get().activeCheckpoints.length + 1,
      };
      await dbSaveCheckpoint(cp);
      set({ activeCheckpoints: [...get().activeCheckpoints, cp] });
    },

    loadCheckpoints: async (tripId: string) => {
      const checkpoints = await dbLoadCheckpoints(tripId);
      return checkpoints;
    },
  };
});

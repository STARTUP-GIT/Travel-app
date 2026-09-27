import { useEffect, useRef, useCallback, useState } from 'react';
import { useTripStore } from '../store/trip-store';
import {
  startGPSStream,
  startHeadingStream,
  ensurePermissions,
  hasPermissions,
  startBackgroundLocationTask,
  stopBackgroundLocationTask,
  getCurrentLocation,
  requestBackgroundPermission,
  isGeolocationSupported,
  queryGeolocationPermission,
  getCurrentLocationDetailed,
} from '../services/location-service';
import type { GeoFailure } from '../services/location-service';
import {
  initializeNetworkState,
  startNetworkListener,
} from '../services/network-service';
import { tripEngine } from '../services/trip-service';
import { sensorService } from '../services/sensor-service';
import { Branding } from '../constants/theme';

/**
 * Resolved, always-terminating GPS acquisition state for the UI.
 * - `initializing` a request is in flight (bounded by the service timeout)
 * - `ready`       a valid position was accepted; the tracker is usable
 * - `denied`      the user or the browser blocked location
 * - `unavailable` no geolocation support, or no acceptable fix
 * - `timeout`     the acquisition timed out
 * `error` carries the reason so the screen can show a real message + retry.
 */
export type GpsPhase = 'initializing' | 'ready' | 'denied' | 'unavailable' | 'timeout';

/**
 * Session host: wires the low-level location/network services to the TripEngine
 * for the Home screen. Owns a single GPS subscription lifecycle (no duplicates,
 * always cleaned up), the compass stream and the network listener.
 *
 * The 1-second return/off-route/timer loop lives inside the TripEngine, so this
 * hook does not need its own tick interval.
 */
export function useTripSession() {
  const setNetwork = useTripStore((s) => s.setNetwork);
  const setGPSActive = useTripStore((s) => s.setGPSActive);
  const setHasInitialPosition = useTripStore((s) => s.setHasInitialPosition);

  const [permissionLoading, setPermissionLoading] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);

  /**
   * Resolved acquisition state. Every path below terminates in `ready`,
   * `denied`, `unavailable` or `timeout` — there is no branch that leaves the
   * screen waiting indefinitely.
   */
  const [gpsPhase, setGpsPhase] = useState<GpsPhase>('initializing');
  const [gpsError, setGpsError] = useState<GeoFailure | null>(null);
  const [gpsSignalLost, setGpsSignalLost] = useState(false);
  const acquisitionRef = useRef(0);

  /**
   * Deliberate deviation from the original (confirmed with the product owner).
   *
   * The original starts the GPS watch as soon as permission is granted, so
   * simply opening the screen begins a `watchPosition` subscription. This port
   * adds a single arming gate: the watch is not started until the user
   * explicitly presses Start, or continues an unfinished trip. Nothing else is
   * changed — the same `start()` body, the same GPS stream, the same engine
   * subscription, the same cleanup, and the same single-watcher guarantee.
   */
  const [trackingArmed, setTrackingArmed] = useState(false);
  const firstFixWaiterRef = useRef<(() => void) | null>(null);

  const gpsCleanupRef = useRef<(() => void) | null>(null);
  const headingCleanupRef = useRef<(() => void) | null>(null);
  const networkCleanupRef = useRef<(() => void) | null>(null);
  const sensorCleanupRef = useRef<(() => void) | null>(null);
  const requestingRef = useRef(false);
  const mountedRef = useRef(true);

  /**
   * ONE-SHOT position acquisition used to prepare the tracker.
   *
   * This is `getCurrentPosition`, not `watchPosition`, so opening the screen
   * does not start a persistent location watcher. The accepted fix is pushed
   * through the original store entry point (`setCurrentPosition` → engine
   * `ingestFix`) so accuracy and validity follow the original rules. Because
   * the engine has no trip in state IDLE, this cannot accumulate distance,
   * start the trip timer, record route points or compute speed.
   *
   * Every outcome sets a terminal phase; `acquisitionRef` guards against a
   * stale response overwriting a newer retry.
   */
  const acquireInitialFix = useCallback(async () => {
    const token = ++acquisitionRef.current;
    setGpsPhase('initializing');
    setGpsError(null);

    const result = await getCurrentLocationDetailed();
    if (!mountedRef.current || token !== acquisitionRef.current) return;

    if (result.ok) {
      useTripStore.getState().setCurrentPosition(result.fix);
      setHasInitialPosition(true);
      setGpsPhase('ready');
      setGpsError(null);
      return;
    }

    setGpsPhase(
      result.error.kind === 'PERMISSION_DENIED'
        ? 'denied'
        : result.error.kind === 'TIMEOUT'
          ? 'timeout'
          : 'unavailable'
    );
    setGpsError(result.error);
  }, [setHasInitialPosition]);

  /**
   * Check location permission. When `prompt` is true and access is not yet
   * granted, show the OS permission dialog. Runs automatically on mount with
   * prompt=false so the app never deadlocks waiting for a button press.
   */
  const checkPermission = useCallback(async (prompt: boolean) => {
    if (requestingRef.current) return;
    requestingRef.current = true;
    if (mountedRef.current) setPermissionLoading(true);
    try {
      if (!isGeolocationSupported()) {
        if (!mountedRef.current) return;
        setPermissionGranted(false);
        setGpsPhase('unavailable');
        setGpsError({
          kind: 'UNSUPPORTED',
          message: 'This browser does not provide location services.',
        });
        return;
      }

      // Real permission state. The original `hasPermissions()` only checks that
      // the API exists, which is true even when the user has blocked location,
      // so it cannot decide whether to show the tracker.
      let state = await queryGeolocationPermission();

      if (state === 'prompt' && prompt) {
        // Trigger the OS/browser permission dialog, then re-read the state.
        await ensurePermissions();
        await requestBackgroundPermission().catch(() => {});
        state = await queryGeolocationPermission();
      }

      if (!mountedRef.current) return;

      if (state === 'denied') {
        setPermissionGranted(false);
        setGpsPhase('denied');
        setGpsError({
          kind: 'PERMISSION_DENIED',
          message: 'Location permission is blocked for this site.',
        });
        return;
      }

      setPermissionGranted(true);
      // 'granted' and 'prompt' both proceed to the one-shot acquisition below,
      // which is what actually raises the browser prompt and reports the result.
      void acquireInitialFix();
    } catch {
      if (!mountedRef.current) return;
      setPermissionGranted(false);
      setGpsPhase('unavailable');
      setGpsError({
        kind: 'POSITION_UNAVAILABLE',
        message: 'Location could not be initialised.',
      });
    } finally {
      if (mountedRef.current) setPermissionLoading(false);
      requestingRef.current = false;
    }
  }, [acquireInitialFix]);

  // Auto-check existing permission on mount (no OS dialog yet).
  useEffect(() => {
    checkPermission(false);
  }, [checkPermission]);

  const requestPermission = useCallback(() => {
    checkPermission(true);
  }, [checkPermission]);

  const start = useCallback(async () => {
    if (gpsCleanupRef.current) return;

    // Network
    const net = await initializeNetworkState();
    if (!mountedRef.current) return;
    setNetwork(net);
    networkCleanupRef.current = startNetworkListener((n) => setNetwork(n));

    // GPS stream → store → engine (source of truth). GPS keeps running even
    // when the network or the map fails.
    const cleanup = startGPSStream(
      (fix) => {
        setGPSActive(true);
        if (mountedRef.current) setGpsSignalLost(false);
        useTripStore.getState().setCurrentPosition(fix);
      },
      (error) => {
        // Report a lost signal so the UI can warn. Does not change tracking.
        if (mountedRef.current) {
          setGpsSignalLost(true);
          setGpsError(error);
        }
      }
    );
    gpsCleanupRef.current = cleanup;

    // Compass heading → engine (for return direction guidance)
    headingCleanupRef.current = startHeadingStream((h) => {
      tripEngine.setDeviceHeading(h);
    });

    // Sensors → engine (shake detection, step counting for movement confidence)
    sensorService.start();
    sensorCleanupRef.current = sensorService.subscribe((state) => {
      tripEngine.setSensorState(state);
    });

    // Initial fix
    const current = await getCurrentLocation();
    if (current && mountedRef.current) {
      useTripStore.getState().setCurrentPosition(current);
      setHasInitialPosition(true);
    }

    // Background task if an active trip is already running
    const state = useTripStore.getState().state;
    if (state === 'ACTIVE' || state === 'RETURNING') {
      startBackgroundLocationTask(Branding.backgroundTaskName);
    }
  }, [setNetwork, setHasInitialPosition, setGPSActive]);

  const stop = useCallback(() => {
    // Invalidate any in-flight one-shot acquisition so a late callback cannot
    // set state after teardown.
    acquisitionRef.current++;
    gpsCleanupRef.current?.();
    gpsCleanupRef.current = null;
    headingCleanupRef.current?.();
    headingCleanupRef.current = null;
    networkCleanupRef.current?.();
    networkCleanupRef.current = null;
    sensorCleanupRef.current?.();
    sensorCleanupRef.current = null;
    sensorService.stop();
    setGPSActive(false);
  }, [setGPSActive]);

  // Permission-gated + user-armed lifecycle. The GPS watch only starts once
  // BOTH location permission is granted AND the user has pressed Start /
  // continued a trip.
  useEffect(() => {
    mountedRef.current = true;
    if (permissionGranted && trackingArmed) {
      start();
    }
    return () => {
      mountedRef.current = false;
      stop();
    };
  }, [permissionGranted, trackingArmed, start, stop]);

  // Start/stop the background location task on trip-state transitions.
  // Paused trips intentionally stop the background task (recording is frozen),
  // which also saves battery.
  const state = useTripStore((s) => s.state);
  useEffect(() => {
    if (state === 'ACTIVE' || state === 'RETURNING') {
      startBackgroundLocationTask(Branding.backgroundTaskName);
    } else {
      stopBackgroundLocationTask(Branding.backgroundTaskName).catch(() => {});
    }
  }, [state]);

  const online = useTripStore((s) => s.networkState) === 'online';

  // Resolve a pending first-fix waiter as soon as the stream delivers a
  // position, so the trip can be created on a real start coordinate.
  const hasInitialPosition = useTripStore((s) => s.hasInitialPosition);
  useEffect(() => {
    if (!hasInitialPosition) return;
    const waiter = firstFixWaiterRef.current;
    firstFixWaiterRef.current = null;
    waiter?.();
  }, [hasInitialPosition]);

  /**
   * Arm the GPS stream on an explicit user action. Resolves true once a first
   * position has arrived, or false if `timeoutMs` elapses first (the trip is
   * still started, and the engine adopts the next accepted fix as its start
   * point — the original `createTrip` behaviour when no fix is available).
   */
  const armTracking = useCallback(async (timeoutMs = 10000): Promise<boolean> => {
    setTrackingArmed(true);
    if (useTripStore.getState().hasInitialPosition) return true;
    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        if (firstFixWaiterRef.current === waiter) firstFixWaiterRef.current = null;
        resolve(false);
      }, timeoutMs);
      const waiter = () => {
        clearTimeout(timer);
        resolve(true);
      };
      firstFixWaiterRef.current = waiter;
    });
  }, []);

  /**
   * Re-run the one-shot acquisition after a permission-denied / unavailable /
   * timeout outcome. Re-checks permission first, because the user may have just
   * re-enabled location in the browser's site settings.
   */
  const retryGps = useCallback(async () => {
    if (requestingRef.current) return;
    requestingRef.current = true;
    if (mountedRef.current) {
      setPermissionLoading(true);
      setGpsPhase('initializing');
      setGpsError(null);
    }
    try {
      const state = await queryGeolocationPermission();
      if (!mountedRef.current) return;
      if (state === 'unsupported') {
        setPermissionGranted(false);
        setGpsPhase('unavailable');
        setGpsError({
          kind: 'UNSUPPORTED',
          message: 'This browser does not provide location services.',
        });
        return;
      }
      if (state === 'denied') {
        setPermissionGranted(false);
        setGpsPhase('denied');
        setGpsError({
          kind: 'PERMISSION_DENIED',
          message: 'Location permission is blocked for this site.',
        });
        return;
      }
      // 'granted' or 'prompt' — the acquisition below raises the prompt if needed.
      setPermissionGranted(true);
      await acquireInitialFix();
    } catch {
      if (!mountedRef.current) return;
      setGpsPhase('unavailable');
      setGpsError({
        kind: 'POSITION_UNAVAILABLE',
        message: 'Location could not be read. Please try again.',
      });
    } finally {
      if (mountedRef.current) setPermissionLoading(false);
      requestingRef.current = false;
    }
  }, [acquireInitialFix]);

  return {
    permissionLoading,
    permissionGranted,
    requestPermission,
    armTracking,
    retryGps,
    gpsPhase,
    gpsError,
    gpsSignalLost,
    online,
  };
}

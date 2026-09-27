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
} from '../services/location-service';
import {
  initializeNetworkState,
  startNetworkListener,
} from '../services/network-service';
import { tripEngine } from '../services/trip-service';
import { sensorService } from '../services/sensor-service';
import { Branding } from '../constants/theme';

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
   * Check location permission. When `prompt` is true and access is not yet
   * granted, show the OS permission dialog. Runs automatically on mount with
   * prompt=false so the app never deadlocks waiting for a button press.
   */
  const checkPermission = useCallback(async (prompt: boolean) => {
    if (requestingRef.current) return;
    requestingRef.current = true;
    if (mountedRef.current) setPermissionLoading(true);
    try {
      let ok = await hasPermissions();
      if (!ok && prompt) {
        ok = await ensurePermissions();
      }
      if (ok && prompt) {
        // Best-effort background access; not required for foreground tracking.
        await requestBackgroundPermission().catch(() => {});
      }
      if (!mountedRef.current) return;
      setPermissionGranted(ok);
    } catch {
      if (mountedRef.current) setPermissionGranted(false);
    } finally {
      if (mountedRef.current) setPermissionLoading(false);
      requestingRef.current = false;
    }
  }, []);

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
    const cleanup = startGPSStream((fix) => {
      setGPSActive(true);
      useTripStore.getState().setCurrentPosition(fix);
    });
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

  return {
    permissionLoading,
    permissionGranted,
    requestPermission,
    armTracking,
    online,
  };
}

import { useEffect, useRef, useCallback, useState } from 'react';
import { useTripStore } from './trip-store';
import {
  startGPSStream,
  startHeadingStream,
  ensurePermissions,
  startBackgroundLocationTask,
  stopBackgroundLocationTask,
  getCurrentLocation,
  requestBackgroundPermission,
  queryGeolocationPermission,
  watchForAccurateLocation,
  type GeoFailure,
} from './location-service';
import {
  initializeNetworkState,
  startNetworkListener,
} from './network-service';
import { tripEngine } from './trip-service';
import { sensorService } from './sensor-service';
import { Branding } from './theme';

export type GpsPhase =
  | 'initializing'
  | 'improving'
  | 'ready'
  | 'denied'
  | 'unavailable'
  | 'timeout';

export function useTripSession() {
  const setNetwork = useTripStore((s) => s.setNetwork);
  const setGPSActive = useTripStore((s) => s.setGPSActive);
  const setHasInitialPosition = useTripStore((s) => s.setHasInitialPosition);

  const [permissionLoading, setPermissionLoading] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const [gpsPhase, setGpsPhase] = useState<GpsPhase>('initializing');
  const [gpsError, setGpsError] = useState<GeoFailure | null>(null);
  const [improvingAccuracy, setImprovingAccuracy] = useState<number | null>(null);
  const [gpsSignalLost, setGpsSignalLost] = useState(false);
  const acquisitionRef = useRef(0);
  const acquisitionAbortRef = useRef<AbortController | null>(null);

  const [trackingArmed, setTrackingArmed] = useState(false);
  const firstFixWaiterRef = useRef<(() => void) | null>(null);

  const gpsCleanupRef = useRef<(() => void) | null>(null);
  const headingCleanupRef = useRef<(() => void) | null>(null);
  const networkCleanupRef = useRef<(() => void) | null>(null);
  const sensorCleanupRef = useRef<(() => void) | null>(null);
  const requestingRef = useRef(false);
  const mountedRef = useRef(true);
  const startInFlightRef = useRef(false);
  const startRunRef = useRef(0);

  const acquireInitialFix = useCallback(async () => {
    const token = ++acquisitionRef.current;
    acquisitionAbortRef.current?.abort();
    const controller = new AbortController();
    acquisitionAbortRef.current = controller;
    setGpsPhase('initializing');
    setGpsError(null);
    setImprovingAccuracy(null);

    const result = await watchForAccurateLocation(
      (accuracy) => {
        if (!mountedRef.current || token !== acquisitionRef.current) return;
        setImprovingAccuracy(accuracy);
        setGpsPhase('improving');
      },
      controller.signal
    );
    if (acquisitionAbortRef.current === controller) {
      acquisitionAbortRef.current = null;
    }
    if (!result || !mountedRef.current || token !== acquisitionRef.current) return;

    if (result.ok) {
      useTripStore.getState().setCurrentPosition(result.fix);
      setHasInitialPosition(true);
      setGpsPhase('ready');
      setGpsError(null);
      setImprovingAccuracy(null);
      return;
    }

    setImprovingAccuracy(null);
    setGpsPhase(
      result.error.kind === 'PERMISSION_DENIED'
        ? 'denied'
        : result.error.kind === 'TIMEOUT'
          ? 'timeout'
          : 'unavailable'
    );
    setGpsError(result.error);
  }, [setHasInitialPosition]);

  const checkPermission = useCallback(async (prompt: boolean) => {
    if (requestingRef.current) return;
    requestingRef.current = true;
    if (mountedRef.current) setPermissionLoading(true);
    try {
      let state = await queryGeolocationPermission();

      if (state === 'prompt' && prompt) {
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
          message: 'Location permission is denied on this device.',
        });
        setImprovingAccuracy(null);
        return;
      }

      setPermissionGranted(true);
      void acquireInitialFix();
    } catch {
      if (!mountedRef.current) return;
      setPermissionGranted(false);
      setGpsPhase('unavailable');
      setGpsError({
        kind: 'POSITION_UNAVAILABLE',
        message: 'Location services could not be initialised.',
      });
    } finally {
      if (mountedRef.current) setPermissionLoading(false);
      requestingRef.current = false;
    }
  }, [acquireInitialFix]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void checkPermission(false);
    });
    return () => {
      active = false;
    };
  }, [checkPermission]);

  const requestPermission = useCallback(() => {
    checkPermission(true);
  }, [checkPermission]);

  const start = useCallback(async () => {
    if (gpsCleanupRef.current || startInFlightRef.current) return;
    startInFlightRef.current = true;
    const run = ++startRunRef.current;

    try {
      const net = await initializeNetworkState();
      if (!mountedRef.current || run !== startRunRef.current) return;
      setNetwork(net);
      networkCleanupRef.current = startNetworkListener((n) => setNetwork(n));

      const cleanup = startGPSStream(
        (fix) => {
          setGPSActive(true);
          if (mountedRef.current) setGpsSignalLost(false);
          useTripStore.getState().setCurrentPosition(fix);
        },
        (error) => {
          if (mountedRef.current) {
            setGpsSignalLost(true);
            setGpsError(error);
          }
        }
      );
      if (!mountedRef.current || run !== startRunRef.current) {
        cleanup();
        return;
      }
      gpsCleanupRef.current = cleanup;

      headingCleanupRef.current = startHeadingStream((h) => {
        tripEngine.setDeviceHeading(h);
      });

      sensorService.start();
      sensorCleanupRef.current = sensorService.subscribe((state) => {
        tripEngine.setSensorState(state);
      });

      const current = await getCurrentLocation();
      if (current && mountedRef.current && run === startRunRef.current) {
        useTripStore.getState().setCurrentPosition(current);
        setHasInitialPosition(true);
      }

      const state = useTripStore.getState().state;
      if (state === 'ACTIVE' || state === 'RETURNING') {
        startBackgroundLocationTask(Branding.backgroundTaskName);
      }
    } finally {
      if (run === startRunRef.current) startInFlightRef.current = false;
    }
  }, [setNetwork, setHasInitialPosition, setGPSActive]);

  const stop = useCallback(() => {
    startRunRef.current++;
    startInFlightRef.current = false;
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

  useEffect(() => () => {
    acquisitionRef.current++;
    acquisitionAbortRef.current?.abort();
    acquisitionAbortRef.current = null;
  }, []);

  const state = useTripStore((s) => s.state);
  useEffect(() => {
    if (state === 'ACTIVE' || state === 'RETURNING') {
      startBackgroundLocationTask(Branding.backgroundTaskName);
    } else {
      stopBackgroundLocationTask(Branding.backgroundTaskName).catch(() => {});
    }
  }, [state]);

  const online = useTripStore((s) => s.networkState) === 'online';
  const hasInitialPosition = useTripStore((s) => s.hasInitialPosition);

  useEffect(() => {
    if (!hasInitialPosition) return;
    const waiter = firstFixWaiterRef.current;
    firstFixWaiterRef.current = null;
    waiter?.();
  }, [hasInitialPosition]);

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

  const retryGps = useCallback(async () => {
    if (requestingRef.current) return;
    acquisitionRef.current++;
    acquisitionAbortRef.current?.abort();
    acquisitionAbortRef.current = null;
    requestingRef.current = true;
    if (mountedRef.current) {
      setPermissionLoading(true);
      setGpsPhase('initializing');
      setGpsError(null);
      setImprovingAccuracy(null);
    }
    try {
      const state = await queryGeolocationPermission();
      if (!mountedRef.current) return;
      if (state === 'denied') {
        setPermissionGranted(false);
        setGpsPhase('denied');
        setGpsError({
          kind: 'PERMISSION_DENIED',
          message: 'Location permission is denied.',
        });
        return;
      }
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
    improvingAccuracy,
    gpsSignalLost,
    online,
  };
}

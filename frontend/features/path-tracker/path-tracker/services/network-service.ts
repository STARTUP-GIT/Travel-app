import { NetworkState } from '../types';

/**
 * Platform boundary: the original Path-Tracker reads connectivity from
 * `@react-native-community/netinfo` (NetInfoState). On the web the equivalent
 * native signal is the browser's Network Information API combined with the
 * `online` / `offline` window events.
 *
 * The three-state mapping below is the original `mapState` from
 * Path-Tracker/src/services/network-service.ts, unchanged:
 *
 *   isConnected === true  && isInternetReachable === true   -> 'online'
 *   isConnected === false || isInternetReachable === false  -> 'offline'
 *   otherwise                                              -> 'unknown'
 *
 * Connectivity is used ONLY to decide whether an online recovery route may be
 * fetched. It never participates in distance, timer, speed or route recording.
 */

interface BrowserConnectivity {
  isConnected: boolean;
  isInternetReachable: boolean | null;
}

interface NetworkInformation {
  downlink?: number;
  effectiveType?: string;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}

function getConnection(): NetworkInformation | null {
  if (typeof navigator === 'undefined') return null;
  const nav = navigator as Navigator & { connection?: NetworkInformation };
  return nav.connection ?? null;
}

function readConnectivity(): BrowserConnectivity {
  if (typeof navigator === 'undefined') {
    return { isConnected: false, isInternetReachable: null };
  }
  const isConnected = navigator.onLine;
  const conn = getConnection();
  if (!conn) {
    return { isConnected, isInternetReachable: isConnected };
  }
  if (!isConnected) {
    return { isConnected, isInternetReachable: false };
  }
  if (typeof conn.downlink === 'number' && conn.downlink === 0) {
    return { isConnected, isInternetReachable: false };
  }
  return { isConnected, isInternetReachable: true };
}

function mapState(state: BrowserConnectivity): NetworkState {
  if (state.isConnected === true && state.isInternetReachable === true) {
    return 'online';
  }
  if (state.isConnected === false || state.isInternetReachable === false) {
    return 'offline';
  }
  return 'unknown';
}

type Callback = (state: NetworkState) => void;

let listeners: Callback[] = [];
let current: NetworkState = 'unknown';
let unsubscribe: (() => void) | null = null;

export function startNetworkListener(cb: Callback): () => void {
  listeners.push(cb);
  cb(current);

  if (!unsubscribe && typeof window !== 'undefined') {
    const onChange = () => {
      current = mapState(readConnectivity());
      for (const l of listeners) l(current);
    };
    window.addEventListener('online', onChange);
    window.addEventListener('offline', onChange);
    getConnection()?.addEventListener?.('change', onChange);
    unsubscribe = () => {
      window.removeEventListener('online', onChange);
      window.removeEventListener('offline', onChange);
      getConnection()?.removeEventListener?.('change', onChange);
    };
  }

  return () => {
    listeners = listeners.filter((l) => l !== cb);
    if (listeners.length === 0 && unsubscribe) {
      unsubscribe();
      unsubscribe = null;
      current = 'unknown';
    }
  };
}

export async function initializeNetworkState(): Promise<NetworkState> {
  try {
    const state = readConnectivity();
    current = mapState(state);
    return current;
  } catch {
    return 'unknown';
  }
}

export function getNetworkState(): NetworkState {
  return current;
}

export function isOnline(): boolean {
  return current === 'online';
}

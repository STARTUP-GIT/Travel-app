import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { NetworkState } from '../types';

type Callback = (state: NetworkState) => void;

let listeners: Callback[] = [];
let current: NetworkState = 'unknown';
let unsubscribe: (() => void) | null = null;

function mapState(state: NetInfoState): NetworkState {
  if (state.isConnected === true && state.isInternetReachable === true) {
    return 'online';
  }
  if (state.isConnected === false || state.isInternetReachable === false) {
    return 'offline';
  }
  return 'unknown';
}

export function startNetworkListener(cb: Callback): () => void {
  listeners.push(cb);
  cb(current);

  if (!unsubscribe) {
    unsubscribe = NetInfo.addEventListener((state) => {
      current = mapState(state);
      for (const l of listeners) l(current);
    });
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
    const state = await NetInfo.fetch();
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

import { NetworkState } from './types';

let currentNetworkState: NetworkState = 'online';
type Listener = (state: NetworkState) => void;
const listeners = new Set<Listener>();

export async function initializeNetworkState(): Promise<NetworkState> {
  currentNetworkState = 'online';
  return 'online';
}

export function startNetworkListener(callback: Listener): () => void {
  listeners.add(callback);
  callback(currentNetworkState);
  return () => listeners.delete(callback);
}

export function isOnline(): boolean {
  return currentNetworkState === 'online';
}

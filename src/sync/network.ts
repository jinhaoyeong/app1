import * as Network from 'expo-network';

/**
 * Web exposes a reliable, synchronous connection signal. Native uses Expo's
 * current network state before allowing a cloud mutation.
 */
export async function isConnectionAvailable(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
    return navigator.onLine !== false;
  }
  try {
    const state = await Network.getNetworkStateAsync();
    return state.isConnected === true && state.isInternetReachable !== false;
  } catch {
    // A network-state check must never turn an otherwise usable connection
    // into a false offline block. The actual cloud request remains authoritative.
    return true;
  }
}

export function isOfflineFailure(error: unknown): boolean {
  if (
    typeof navigator !== 'undefined' &&
    'onLine' in navigator &&
    !navigator.onLine
  ) {
    return true;
  }
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return [
    'network',
    'fetch',
    'offline',
    'failed to fetch',
    'internet',
    'connection',
  ].some((term) => message.includes(term));
}

/** Fires when the browser or OS reports a connectivity change. */
export function subscribeToConnection(
  listener: (online: boolean) => void,
): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const onOnline = () => listener(true);
  const onOffline = () => listener(false);
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

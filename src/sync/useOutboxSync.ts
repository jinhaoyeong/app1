import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useLumaStore } from '@/store/lumaStore';
import { subscribeToConnection } from '@/sync/network';

/**
 * Drains the signed-in outbox when the network returns or the app
 * comes back to the foreground. Hydration is the first load; this is
 * the follow-up so an evening log written on a train still reaches the
 * account once wifi is back.
 */
export function useOutboxSync() {
  const hydrated = useLumaStore((s) => s.hydrated);
  const userId = useLumaStore((s) => s.cloudUserId);
  const flushPending = useLumaStore((s) => s.flushPending);

  useEffect(() => {
    if (!hydrated || !userId) return;
    void flushPending();
  }, [hydrated, userId, flushPending]);

  useEffect(() => {
    const unsub = subscribeToConnection((online) => {
      if (online) void useLumaStore.getState().flushPending();
    });
    const app = AppState.addEventListener('change', (state) => {
      if (state === 'active') void useLumaStore.getState().flushPending();
    });
    return () => {
      unsub();
      app.remove();
    };
  }, []);
}

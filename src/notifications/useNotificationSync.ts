import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useLumaStore } from '@/store/lumaStore';
import { useCycleIntelligence } from '@/hooks/useCycleIntelligence';
import { syncNotifications } from './scheduler';

/**
 * Keeps the OS schedule in step with preferences and the current prediction.
 *
 * Reconciliation is idempotent, so running it on every relevant change and on
 * every foreground is safe: identical state performs no writes. Resuming is
 * the moment that matters for correctness — it is when a timezone change, a
 * DST transition, or a day rollover becomes visible.
 */
export function useNotificationSync() {
  const prefs = useLumaStore((s) => s.notifications);
  const discreet = useLumaStore((s) => s.appearance.discreetMode);
  const hydrated = useLumaStore((s) => s.hydrated);
  const { prediction } = useCycleIntelligence();

  // Held in a ref so the AppState listener never needs re-subscribing.
  const latest = useRef({ prefs, discreet, prediction });
  useEffect(() => {
    latest.current = { prefs, discreet, prediction };
  }, [prefs, discreet, prediction]);

  useEffect(() => {
    if (!hydrated) return;
    syncNotifications({ prefs, prediction, discreet });
  }, [hydrated, prefs, prediction, discreet]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const { prefs: p, discreet: d, prediction: pr } = latest.current;
      syncNotifications({ prefs: p, prediction: pr, discreet: d });
    });
    return () => sub.remove();
  }, []);
}

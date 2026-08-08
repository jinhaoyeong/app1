import type { AppearancePrefs } from '@/types';

export type LockTimeout = AppearancePrefs['biometricTimeout'];

/** How long Luma may stay unlocked in the background before re-locking. */
export const LOCK_TIMEOUT_MS: Record<LockTimeout, number> = {
  immediate: 0,
  '1m': 60_000,
  '5m': 5 * 60_000,
};

export const LOCK_TIMEOUT_LABEL: Record<LockTimeout, string> = {
  immediate: 'Immediately',
  '1m': 'After 1 minute',
  '5m': 'After 5 minutes',
};

/**
 * Whether the app should start locked.
 *
 * A cold start always locks when the preference is on. Unlock state lives only
 * in memory — it is never persisted — so relaunching the app cannot inherit an
 * "already authenticated" flag from disk.
 */
export function shouldLockOnColdStart(options: {
  enabled: boolean;
  available: boolean;
}): boolean {
  // With no enrolled biometrics or passcode there is nothing to authenticate
  // against; locking would strand the user out of their own data.
  if (!options.available) return false;
  return options.enabled;
}

/**
 * Whether returning to the foreground should require authentication again.
 *
 * `backgroundedAt` is undefined when the app has not been backgrounded since
 * unlocking, in which case nothing has changed and the session stands.
 */
export function shouldLockOnResume(options: {
  enabled: boolean;
  available: boolean;
  backgroundedAt?: number;
  now: number;
  timeout: LockTimeout;
}): boolean {
  if (!options.available) return false;
  if (!options.enabled) return false;
  if (options.backgroundedAt === undefined) return false;

  const elapsed = options.now - options.backgroundedAt;
  // A clock that moved backwards (timezone change, manual set, NTP correction)
  // must fail closed rather than granting an unbounded unlocked window.
  if (elapsed < 0) return true;

  return elapsed >= LOCK_TIMEOUT_MS[options.timeout];
}

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useLumaStore } from '@/store/lumaStore';
import { shouldLockOnColdStart, shouldLockOnResume } from './lockPolicy';

export type LockAvailability =
  | 'checking'
  /** Hardware and an enrolled biometric or passcode are both present. */
  | 'available'
  /** No hardware, or nothing enrolled — the OS cannot authenticate the user. */
  | 'unavailable';

type AppLockValue = {
  locked: boolean;
  availability: LockAvailability;
  /** Set when the last attempt was cancelled or failed. */
  error?: string;
  authenticate: () => Promise<boolean>;
};

const AppLockContext = createContext<AppLockValue | null>(null);

async function checkAvailability(): Promise<LockAvailability> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return 'unavailable';
    // `isEnrolledAsync` covers biometrics; a device passcode alone still lets
    // `authenticateAsync` succeed, so treat either as usable.
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    const hasSecret =
      enrolled || level !== LocalAuthentication.SecurityLevel.NONE;
    return hasSecret ? 'available' : 'unavailable';
  } catch {
    // Web and unsupported platforms land here.
    return 'unavailable';
  }
}

/**
 * Holds the lock state for the session.
 *
 * The unlocked flag lives in React state only — deliberately never persisted —
 * so a relaunch, a crash, or someone editing storage cannot resume an
 * authenticated session.
 */
export function AppLockProvider({ children }: { children: ReactNode }) {
  const enabled = useLumaStore((s) => s.appearance.biometricLock);
  const timeout = useLumaStore((s) => s.appearance.biometricTimeout);

  const [availability, setAvailability] =
    useState<LockAvailability>('checking');
  const [lockedByPolicy, setLockedByPolicy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const available = availability === 'available';
  // Derived rather than synchronised: turning the preference off, or losing
  // the device's ability to authenticate, must never leave someone stranded
  // behind a lock screen they cannot pass.
  const locked = lockedByPolicy && enabled && available;

  const backgroundedAt = useRef<number | undefined>(undefined);
  // Lets the AppState listener read current settings without re-subscribing.
  const settings = useRef({ enabled, timeout, available });
  useEffect(() => {
    settings.current = { enabled, timeout, available };
  }, [enabled, timeout, available]);

  useEffect(() => {
    let cancelled = false;
    checkAvailability().then((next) => {
      if (cancelled) return;
      setAvailability(next);
      setLockedByPolicy(
        shouldLockOnColdStart({
          enabled: useLumaStore.getState().appearance.biometricLock,
          available: next === 'available',
        }),
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      const current = settings.current;
      if (state === 'active') {
        const lock = shouldLockOnResume({
          enabled: current.enabled,
          available: current.available,
          backgroundedAt: backgroundedAt.current,
          now: Date.now(),
          timeout: current.timeout,
        });
        backgroundedAt.current = undefined;
        if (lock) {
          setError(undefined);
          setLockedByPolicy(true);
        }
        return;
      }
      // 'inactive' covers the iOS app switcher and incoming calls.
      if (backgroundedAt.current === undefined) {
        backgroundedAt.current = Date.now();
      }
    };

    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  const authenticate = useCallback(async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Luma',
        cancelLabel: 'Cancel',
        // Allow the device passcode so a failed fingerprint is not a dead end.
        disableDeviceFallback: false,
      });
      if (result.success) {
        setError(undefined);
        setLockedByPolicy(false);
        return true;
      }
      setError(
        result.error === 'user_cancel' || result.error === 'system_cancel'
          ? 'Cancelled. Luma stays locked.'
          : 'That did not match. You can try again.',
      );
      return false;
    } catch {
      setError('Your device could not complete the check.');
      return false;
    }
  }, []);

  return (
    <AppLockContext.Provider
      value={{ locked, availability, error, authenticate }}
    >
      {children}
    </AppLockContext.Provider>
  );
}

export function useAppLock() {
  const ctx = useContext(AppLockContext);
  if (!ctx) throw new Error('useAppLock must be used within AppLockProvider');
  return ctx;
}

/** Whether the device can actually enforce a lock, for the settings screen. */
export async function isDeviceLockAvailable() {
  return (await checkAvailability()) === 'available';
}

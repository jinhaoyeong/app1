import {
  LOCK_TIMEOUT_MS,
  shouldLockOnColdStart,
  shouldLockOnResume,
} from '../src/security/lockPolicy';

describe('app lock policy', () => {
  describe('cold start', () => {
    test('locks when enabled and the device can authenticate', () => {
      expect(shouldLockOnColdStart({ enabled: true, available: true })).toBe(
        true,
      );
    });

    test('does not lock when the preference is off', () => {
      expect(shouldLockOnColdStart({ enabled: false, available: true })).toBe(
        false,
      );
    });

    test('does not lock when no biometrics or passcode are enrolled', () => {
      // Locking here would strand someone outside their own data with no way
      // to authenticate.
      expect(shouldLockOnColdStart({ enabled: true, available: false })).toBe(
        false,
      );
    });
  });

  describe('resume', () => {
    const base = {
      enabled: true,
      available: true,
      now: 1_000_000,
      timeout: '1m' as const,
    };

    test('stays unlocked when the app was never backgrounded', () => {
      expect(shouldLockOnResume({ ...base, backgroundedAt: undefined })).toBe(
        false,
      );
    });

    test('stays unlocked inside the timeout window', () => {
      expect(
        shouldLockOnResume({
          ...base,
          backgroundedAt: base.now - (LOCK_TIMEOUT_MS['1m'] - 1),
        }),
      ).toBe(false);
    });

    test('locks once the timeout has elapsed', () => {
      expect(
        shouldLockOnResume({
          ...base,
          backgroundedAt: base.now - LOCK_TIMEOUT_MS['1m'],
        }),
      ).toBe(true);
    });

    test('"immediate" locks on any return to the foreground', () => {
      expect(
        shouldLockOnResume({
          ...base,
          timeout: 'immediate',
          backgroundedAt: base.now,
        }),
      ).toBe(true);
    });

    test('five minute window honours its own bound', () => {
      const backgroundedAt = base.now - 4 * 60_000;
      expect(
        shouldLockOnResume({ ...base, timeout: '5m', backgroundedAt }),
      ).toBe(false);
      expect(
        shouldLockOnResume({
          ...base,
          timeout: '5m',
          backgroundedAt: base.now - 5 * 60_000,
        }),
      ).toBe(true);
    });

    test('fails closed if the clock moves backwards', () => {
      // A timezone change or manual clock set must not grant an unbounded
      // unlocked window.
      expect(
        shouldLockOnResume({ ...base, backgroundedAt: base.now + 60_000 }),
      ).toBe(true);
    });

    test('never locks when the preference is off or auth is unavailable', () => {
      const backgroundedAt = base.now - 10 * 60_000;
      expect(
        shouldLockOnResume({ ...base, enabled: false, backgroundedAt }),
      ).toBe(false);
      expect(
        shouldLockOnResume({ ...base, available: false, backgroundedAt }),
      ).toBe(false);
    });
  });
});

import {
  dailyLogFromCloudRow,
  dailyLogToCloudRow,
  preferencesFromCloudRow,
  preferencesToCloudRow,
  profileFromCloudRow,
  profileToCloudRow,
} from '@/sync/rowMappers';
import {
  exchangeAuthUrl,
  hasAuthResponse,
  parseAuthUrl,
} from '@/auth/deepLink';
import type {
  AppearancePrefs,
  DailyLog,
  NotificationPrefs,
  Profile,
} from '@/types';

const profile: Profile = {
  displayName: 'Mia',
  timezone: 'Asia/Kuala_Lumpur',
  locale: 'en',
  onboardingComplete: true,
  trackingGoals: ['predict_period', 'understand_symptoms'],
  lastPeriodStartDate: '2026-08-01',
  usualPeriodLength: 5,
  cycleRegularity: 'usually',
  contraceptionType: 'none',
  safetyContexts: ['none'],
  safetyContextReviewed: true,
  fertilityEnabled: false,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-09T00:00:00.000Z',
};

const log: DailyLog = {
  id: 'luma_log_1',
  date: '2026-08-09',
  flow: 'medium',
  bleedingType: 'natural_period',
  mood: 'okay',
  energy: 'low',
  pain: 'mild',
  painLocations: ['cramps'],
  symptoms: ['bloating'],
  sleepHours: 7.5,
  note: 'A little tired',
  updatedAt: '2026-08-09T09:00:00.000Z',
};

const appearance: AppearancePrefs = {
  colorMode: 'dark',
  accent: 'lavender',
  discreetMode: true,
};

const notifications: NotificationPrefs = {
  periodPrediction: true,
  periodPreparation: false,
  dailyLog: true,
  patternDiscovered: true,
  importantChange: false,
  showDetailedText: false,
};

describe('cloud row mapping', () => {
  it('round-trips a profile without changing domain names', () => {
    expect(profileFromCloudRow(profileToCloudRow('user-1', profile))).toEqual(
      profile,
    );
  });

  it('round-trips a daily log including optional measurements', () => {
    expect(dailyLogFromCloudRow(dailyLogToCloudRow('user-1', log))).toEqual(
      log,
    );
  });

  it('round-trips account appearance and notification preferences', () => {
    const row = preferencesToCloudRow('user-1', appearance, notifications, [
      'cramps',
      'bloating',
    ]);
    expect(preferencesFromCloudRow(row)).toEqual({
      appearance,
      notifications,
      favouriteSymptoms: ['cramps', 'bloating'],
    });
  });
});

describe('magic-link return parsing', () => {
  it('recognizes auth responses regardless of the route they return to', () => {
    expect(
      hasAuthResponse(parseAuthUrl('https://example.test/?code=abc')),
    ).toBe(true);
    expect(
      hasAuthResponse(
        parseAuthUrl('https://example.test/auth/callback#error=access_denied'),
      ),
    ).toBe(true);
    expect(hasAuthResponse(parseAuthUrl('https://example.test/auth'))).toBe(
      false,
    );
  });

  it('reads a PKCE code from a web/native callback URL', () => {
    expect(parseAuthUrl('luma://auth/callback?code=abc123')).toEqual({
      code: 'abc123',
      flowId: undefined,
      accessToken: undefined,
      refreshToken: undefined,
      error: undefined,
      errorDescription: undefined,
    });
  });

  it('reads implicit tokens and errors from the URL fragment', () => {
    expect(
      parseAuthUrl(
        'https://example.test/auth/callback#access_token=access&refresh_token=refresh&error_description=Nope',
      ),
    ).toEqual({
      code: undefined,
      flowId: undefined,
      accessToken: 'access',
      refreshToken: 'refresh',
      error: undefined,
      errorDescription: 'Nope',
    });
  });

  it('preserves a PKCE flow id for concurrent auth attempts', () => {
    expect(
      parseAuthUrl(
        'https://example.test/auth/callback?code=abc&sb_flow_id=flow_123',
      ),
    ).toEqual({
      code: 'abc',
      flowId: 'flow_123',
      accessToken: undefined,
      refreshToken: undefined,
      error: undefined,
      errorDescription: undefined,
    });
  });

  it('passes the PKCE flow id into the code exchange', async () => {
    const exchangeCodeForSession = jest.fn().mockResolvedValue({ error: null });
    const client = {
      auth: { exchangeCodeForSession },
    } as never;

    await exchangeAuthUrl(
      client,
      'https://example.test/auth/callback?code=abc&sb_flow_id=flow_123',
    );

    expect(exchangeCodeForSession).toHaveBeenCalledWith('abc', {
      flowId: 'flow_123',
    });
  });
});

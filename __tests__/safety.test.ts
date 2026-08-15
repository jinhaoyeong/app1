import {
  fertilityEstimateSafety,
  periodPredictionSafety,
} from '@/engine/safety';
import type { Profile } from '@/types';

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    timezone: 'UTC',
    locale: 'en',
    onboardingComplete: true,
    trackingGoals: ['trying_to_conceive'],
    cycleRegularity: 'usually',
    contraceptionType: 'none',
    safetyContexts: ['none'],
    safetyContextReviewed: true,
    fertilityEnabled: true,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('fertility safety gate', () => {
  it('requires context review before any calendar fertility estimate', () => {
    const result = fertilityEstimateSafety(
      profile({ safetyContextReviewed: false }),
      6,
    );
    expect(result.availability).toBe('context_not_reviewed');
    expect(result.canShow).toBe(false);
  });

  it('requires three completed cycles', () => {
    const result = fertilityEstimateSafety(profile(), 2);
    expect(result.availability).toBe('insufficient_history');
    expect(result.canShow).toBe(false);
  });

  it('hides timing for hormonal contraception and unreliable contexts', () => {
    expect(
      fertilityEstimateSafety(profile({ contraceptionType: 'implant' }), 6)
        .availability,
    ).toBe('hormonal_contraception');
    expect(
      fertilityEstimateSafety(
        profile({ safetyContexts: ['possible_pregnancy'] }),
        6,
      ).availability,
    ).toBe('cycle_context_unreliable');
    expect(
      fertilityEstimateSafety(profile({ contraceptionType: 'other' }), 6)
        .availability,
    ).toBe('contraception_not_reviewed');
  });

  it('only exposes a broad estimate for reviewed, regular, non-hormonal history', () => {
    const result = fertilityEstimateSafety(profile(), 3);
    expect(result.availability).toBe('available');
    expect(result.canShow).toBe(true);
    expect(result.detail).toContain('cannot confirm ovulation');
  });

  it('hides fertile timing when recorded cycle dates are variable', () => {
    const result = fertilityEstimateSafety(profile(), 4, [24, 34, 27, 36]);
    expect(result.canShow).toBe(false);
    expect(result.availability).toBe('cycle_context_unreliable');
  });

  it('uses the conservative 26-to-32-day calendar-method boundary', () => {
    const result = fertilityEstimateSafety(profile(), 3, [25, 28, 30]);
    expect(result.canShow).toBe(false);
    expect(result.detail).toContain('26 and 32 days');
  });
});

describe('period prediction safety gate', () => {
  it('allows a reviewed natural-cycle context', () => {
    expect(periodPredictionSafety(profile()).canShow).toBe(true);
  });

  it('pauses natural-period predictions for hormonal contraception', () => {
    const result = periodPredictionSafety(
      profile({ contraceptionType: 'combined_pill' }),
    );
    expect(result.canShow).toBe(false);
    expect(result.detail).toContain('dosing schedule');
  });

  it('does not use a date prediction to rule out possible pregnancy', () => {
    const result = periodPredictionSafety(
      profile({ safetyContexts: ['possible_pregnancy'] }),
    );
    expect(result.canShow).toBe(false);
    expect(result.title).toContain('cannot rule out pregnancy');
  });
});

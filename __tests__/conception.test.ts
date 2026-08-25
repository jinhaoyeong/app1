import {
  buildConceptionGuidance,
  hasConceptionGoal,
} from '@/engine/conception';
import { buildCycleMap } from '@/engine/fertility';
import {
  fertilityEstimateSafety,
  fertilityEstimateVisible,
} from '@/engine/safety';
import type { PeriodPrediction, Profile } from '@/types';

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

const prediction: PeriodPrediction = {
  predictedStart: '2026-09-26',
  lowerBound: '2026-09-25',
  upperBound: '2026-09-27',
  confidence: 0.8,
  confidenceBand: 'high',
  algorithmVersion: 'test',
  explanation: 'test',
};

function cycleMap() {
  return buildCycleMap({
    cycleStart: '2026-08-30',
    cycleLength: 28,
    periodLength: 5,
    prediction,
    asOf: '2026-09-05',
  });
}

function guidanceFor(p: Profile, completedCycles = 6, lengths = [28, 28, 29]) {
  const safety = fertilityEstimateSafety(p, completedCycles, lengths);
  return buildConceptionGuidance({
    profile: p,
    cycleMap: cycleMap(),
    fertilitySafety: safety,
    fertilityVisible: fertilityEstimateVisible(p, completedCycles, lengths),
  });
}

describe('conception intent is separate from the fertility evidence gate', () => {
  it('shows nothing at all without the declared goal', () => {
    expect(hasConceptionGoal(['predict_period'])).toBe(false);
    expect(guidanceFor(profile({ trackingGoals: ['predict_period'] }))).toBe(
      null,
    );
  });

  it('never infers the goal from logged activity — only the explicit goal counts', () => {
    // There is deliberately no logs argument on buildConceptionGuidance.
    expect(buildConceptionGuidance.length).toBe(1);
    expect(hasConceptionGoal([])).toBe(false);
    expect(hasConceptionGoal(undefined)).toBe(false);
  });

  it('gives education and dates when intent and evidence both clear', () => {
    const guidance = guidanceFor(profile());
    expect(guidance?.goalActive).toBe(true);
    expect(guidance?.datesAvailable).toBe(true);
    expect(guidance?.fertileWindow).toBeDefined();
    expect(guidance?.higherOpportunityWindow).toBeDefined();
    expect(guidance?.estimateCaveat).toMatch(/does not confirm ovulation/i);
  });

  it.each([
    ['hormonal contraception', { contraceptionType: 'combined_pill' as const }],
    ['unreviewed context', { safetyContextReviewed: false }],
    ['irregular cycles', { cycleRegularity: 'sometimes' as const }],
    ['a flagged cycle context', { safetyContexts: ['perimenopause' as const] }],
  ])('withholds dates but keeps education for %s', (_label, overrides) => {
    const guidance = guidanceFor(profile(overrides));
    expect(guidance?.goalActive).toBe(true);
    expect(guidance?.datesAvailable).toBe(false);
    expect(guidance?.fertileWindow).toBeUndefined();
    expect(guidance?.higherOpportunityWindow).toBeUndefined();
    // The education still has to be there — this is the whole point of
    // separating intent from evidence.
    expect(guidance?.education).toMatch(/fertile window/i);
    expect(guidance?.blockedTitle).toBeTruthy();
  });

  it('withholds dates when history is too short, regardless of intent', () => {
    const guidance = guidanceFor(profile(), 2, [28, 28]);
    expect(guidance?.datesAvailable).toBe(false);
    expect(guidance?.education).toBeTruthy();
  });
});

describe('conception guidance never claims false precision', () => {
  it('reports the peak as days before ovulation, not ovulation day', () => {
    const guidance = guidanceFor(profile());
    expect(guidance?.education).toMatch(/before ovulation/i);
    expect(guidance?.education).toMatch(/not on ovulation day/i);
  });

  it('never presents a single best day', () => {
    const guidance = guidanceFor(profile());
    const text = [
      guidance?.education,
      guidance?.estimateCaveat,
      guidance?.signalsNote,
    ]
      .join(' ')
      .toLowerCase();
    expect(text).not.toMatch(/best day/);
    expect(guidance?.education).toMatch(/every one to two days/i);
  });

  it('keeps the higher-opportunity span inside the fertile window', () => {
    const guidance = guidanceFor(profile());
    const window = guidance!.fertileWindow!;
    const peak = guidance!.higherOpportunityWindow!;
    expect(peak.start >= window.start).toBe(true);
    expect(peak.end <= window.end).toBe(true);
    // A span, never a single day collapsed into a claim.
    expect(peak.start <= peak.end).toBe(true);
  });

  it('describes LH testing as indirect rather than confirmation', () => {
    const guidance = guidanceFor(profile());
    expect(guidance?.signalsNote).toMatch(/indirect evidence/i);
    expect(guidance?.signalsNote).not.toMatch(/confirms ovulation/i);
  });

  it('never presents the estimate as contraception', () => {
    const guidance = guidanceFor(profile());
    const text = [guidance?.education, guidance?.estimateCaveat].join(' ');
    expect(text).not.toMatch(/safe day/i);
    expect(text).not.toMatch(/cannot get pregnant/i);
  });
});

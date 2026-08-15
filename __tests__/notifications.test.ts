import {
  buildNotificationPlan,
  localInstant,
  nextDailyInstant,
  reconcile,
  type PlannedNotification,
} from '../src/notifications/plan';
import type { NotificationPrefs, PeriodPrediction } from '../src/types';

const allOff: NotificationPrefs = {
  periodPrediction: false,
  periodPreparation: false,
  dailyLog: false,
  patternDiscovered: false,
  importantChange: false,
  showDetailedText: false,
};

function prediction(lowerBound: string): PeriodPrediction {
  return {
    predictedStart: lowerBound,
    lowerBound,
    upperBound: lowerBound,
    confidence: 0.8,
    confidenceBand: 'high',
    algorithmVersion: 'test',
    explanation: '',
  };
}

/** A fixed "now" well before the predicted window. */
const NOW = localInstant('2026-08-01', 12);

function existingFrom(plan: PlannedNotification[]) {
  return plan.map((p) => ({ id: p.id, triggerAt: p.triggerAt }));
}

describe('notification planning', () => {
  test('plans nothing while every category is off', () => {
    expect(
      buildNotificationPlan({
        prefs: allOff,
        prediction: prediction('2026-08-20'),
        discreet: false,
        now: NOW,
      }),
    ).toEqual([]);
  });

  test('enabling a category adds exactly one notification', () => {
    const plan = buildNotificationPlan({
      prefs: { ...allOff, periodPrediction: true },
      prediction: prediction('2026-08-20'),
      discreet: false,
      now: NOW,
    });
    expect(plan).toHaveLength(1);
    expect(plan[0].category).toBe('periodPrediction');
    // The day before the window opens.
    expect(plan[0].triggerAt).toBe(localInstant('2026-08-19', 9));
  });

  test('never plans a notification in the past', () => {
    const plan = buildNotificationPlan({
      prefs: { ...allOff, periodPrediction: true, periodPreparation: true },
      // Window already open, so both lead times are behind us.
      prediction: prediction('2026-08-01'),
      discreet: false,
      now: NOW,
    });
    expect(plan).toEqual([]);
  });

  test('does not turn a learning scaffold into a period reminder', () => {
    const learning = {
      ...prediction('2026-08-20'),
      confidenceBand: 'learning' as const,
    };
    const plan = buildNotificationPlan({
      prefs: { ...allOff, periodPrediction: true, periodPreparation: true },
      prediction: learning,
      discreet: false,
      now: NOW,
    });
    expect(plan).toEqual([]);
  });

  test('discreet mode replaces the wording at planning time', () => {
    const detailed = buildNotificationPlan({
      prefs: { ...allOff, periodPrediction: true },
      prediction: prediction('2026-08-20'),
      discreet: false,
      now: NOW,
    })[0];
    const discreet = buildNotificationPlan({
      prefs: { ...allOff, periodPrediction: true },
      prediction: prediction('2026-08-20'),
      discreet: true,
      now: NOW,
    })[0];

    expect(detailed.body.toLowerCase()).toContain('period');
    expect(discreet.body.toLowerCase()).not.toContain('period');
    // Different identity, so reconciliation replaces rather than duplicates.
    expect(discreet.id).not.toBe(detailed.id);
  });

  test('the daily reminder is the next occurrence of its hour', () => {
    const morning = localInstant('2026-08-01', 8);
    expect(nextDailyInstant(morning, 20)).toBe(localInstant('2026-08-01', 20));
    const night = localInstant('2026-08-01', 22);
    expect(nextDailyInstant(night, 20)).toBe(localInstant('2026-08-02', 20));
  });
});

describe('notification reconciliation', () => {
  const prefs = { ...allOff, periodPrediction: true, periodPreparation: true };
  const plan = buildNotificationPlan({
    prefs,
    prediction: prediction('2026-08-20'),
    discreet: false,
    now: NOW,
  });

  test('schedules everything when nothing exists yet', () => {
    const { toSchedule, toCancel } = reconcile(plan, []);
    expect(toSchedule).toHaveLength(plan.length);
    expect(toCancel).toEqual([]);
  });

  test('re-running with the same state writes nothing (no duplicates)', () => {
    const { toSchedule, toCancel } = reconcile(plan, existingFrom(plan));
    expect(toSchedule).toEqual([]);
    expect(toCancel).toEqual([]);
  });

  test('a shifted prediction cancels the stale notification and replaces it', () => {
    const moved = buildNotificationPlan({
      prefs,
      prediction: prediction('2026-08-24'),
      discreet: false,
      now: NOW,
    });
    const { toSchedule, toCancel } = reconcile(moved, existingFrom(plan));
    expect(toSchedule).toHaveLength(moved.length);
    // Every previously scheduled id is removed; none is left orphaned.
    expect(toCancel.sort()).toEqual(plan.map((p) => p.id).sort());
  });

  test('disabling a category cancels only that notification', () => {
    const fewer = buildNotificationPlan({
      prefs: { ...prefs, periodPreparation: false },
      prediction: prediction('2026-08-20'),
      discreet: false,
      now: NOW,
    });
    const { toSchedule, toCancel } = reconcile(fewer, existingFrom(plan));
    expect(toSchedule).toEqual([]);
    expect(toCancel).toHaveLength(1);
    expect(toCancel[0]).toContain('periodPreparation');
  });

  test('an empty plan cancels everything — delete and reset', () => {
    const { toSchedule, toCancel } = reconcile([], existingFrom(plan));
    expect(toSchedule).toEqual([]);
    expect(toCancel.sort()).toEqual(plan.map((p) => p.id).sort());
  });

  test('a moved wall-clock instant is rebuilt, covering timezone and DST shifts', () => {
    // Same identity, but the device now resolves that local date to an instant
    // an hour away — what a DST transition or a flight does.
    const drifted = existingFrom(plan).map((e) => ({
      ...e,
      triggerAt: e.triggerAt + 60 * 60_000,
    }));
    const { toSchedule, toCancel } = reconcile(plan, drifted);
    expect(toSchedule).toHaveLength(plan.length);
    expect(toCancel.sort()).toEqual(plan.map((p) => p.id).sort());
  });

  test('a one-minute clock jitter is not treated as a change', () => {
    const jittered = existingFrom(plan).map((e) => ({
      ...e,
      triggerAt: e.triggerAt + 500,
    }));
    const { toSchedule, toCancel } = reconcile(plan, jittered);
    expect(toSchedule).toEqual([]);
    expect(toCancel).toEqual([]);
  });

  test('the repeating daily reminder is stable across days', () => {
    const daily = buildNotificationPlan({
      prefs: { ...allOff, dailyLog: true },
      discreet: false,
      now: NOW,
    });
    // Tomorrow the next occurrence has moved, but the reminder itself has not
    // changed and must not be torn down and rebuilt every sync.
    const tomorrow = daily.map((d) => ({
      id: d.id,
      triggerAt: d.triggerAt - 24 * 60 * 60_000,
    }));
    const { toSchedule, toCancel } = reconcile(daily, tomorrow);
    expect(toSchedule).toEqual([]);
    expect(toCancel).toEqual([]);
  });
});

import type { ConfidenceBand, PeriodPrediction } from '@/types';
import { addLocalDays, clamp, daysBetween } from '@/utils/dates';

/**
 * Calendar timing is a broad estimate, not a measurement of ovulation. The
 * NHS describes ovulation as difficult to pinpoint and commonly occurring
 * around 10–16 days before the next period, so Luma keeps that whole range
 * visible instead of choosing an exact day.
 */
export const OVULATION_DAYS_BEFORE_NEXT_PERIOD_MIN = 10;
export const OVULATION_DAYS_BEFORE_NEXT_PERIOD_MAX = 16;
export const FERTILE_DAYS_BEFORE_OVULATION = 5;
export const FERTILE_DAYS_AFTER_OVULATION = 1;

export type DetailedCyclePhase =
  | 'period'
  | 'follicular'
  | 'possible_fertile'
  | 'possible_ovulation'
  | 'possible_post_ovulation'
  | 'luteal'
  | 'unknown';

export interface CycleMap {
  cycleStart: string;
  periodEnd: string;
  currentCycleDay?: number;
  cycleLength: number;
  periodLength: number;
  nextPeriodStart: string;
  nextPeriodLowerBound: string;
  nextPeriodUpperBound: string;
  fertileWindowStart: string;
  fertileWindowEnd: string;
  ovulationWindowStart: string;
  ovulationWindowEnd: string;
  postOvulationWindowStart: string;
  postOvulationWindowEnd: string;
  fertileWindowCycleDayStart: number;
  fertileWindowCycleDayEnd: number;
  ovulationWindowCycleDayStart: number;
  ovulationWindowCycleDayEnd: number;
  postOvulationWindowCycleDayStart: number;
  postOvulationWindowCycleDayEnd: number;
  confidenceBand: ConfidenceBand;
  explanation: string;
  phaseForDate: (date: string) => DetailedCyclePhase;
}

function maxDate(...dates: string[]): string {
  return dates.reduce((max, date) => (date > max ? date : max), dates[0]);
}

function minDate(...dates: string[]): string {
  return dates.reduce((min, date) => (date < min ? date : min), dates[0]);
}

export function detailedPhaseLabel(phase: DetailedCyclePhase): string {
  switch (phase) {
    case 'period':
      return 'Period days';
    case 'follicular':
      return 'After your period';
    case 'possible_fertile':
      return 'Possible fertile days';
    case 'possible_ovulation':
      return 'Estimated ovulation timing';
    case 'possible_post_ovulation':
      return 'Possible post-ovulation timing';
    case 'luteal':
      return 'Before your next period';
    default:
      return 'Cycle timing not yet known';
  }
}

export function buildCycleMap(options: {
  cycleStart?: string;
  cycleLength?: number;
  periodLength?: number;
  prediction?: PeriodPrediction | null;
  asOf?: string;
}): CycleMap | null {
  if (!options.cycleStart) return null;
  const cycleStart = options.cycleStart;

  const cycleLength = clamp(Math.round(options.cycleLength ?? 28), 14, 90);
  const periodLength = clamp(
    Math.round(options.periodLength ?? 5),
    2,
    Math.min(10, cycleLength - 2),
  );
  const nextPeriodStart =
    options.prediction?.predictedStart ?? addLocalDays(cycleStart, cycleLength);
  const nextPeriodLowerBound =
    options.prediction?.lowerBound ?? nextPeriodStart;
  const nextPeriodUpperBound =
    options.prediction?.upperBound ?? nextPeriodStart;
  const periodEnd = addLocalDays(cycleStart, periodLength - 1);
  const firstPossiblePostPeriodDay = addLocalDays(periodEnd, 1);
  const lastPossibleCycleDay = maxDate(
    firstPossiblePostPeriodDay,
    addLocalDays(nextPeriodUpperBound, -1),
  );

  // Keep a range of possible timing inside the visible cycle. The dates are
  // deliberately broad: an app calendar cannot confirm when ovulation occurs.
  const rawOvulationStart = addLocalDays(
    nextPeriodLowerBound,
    -OVULATION_DAYS_BEFORE_NEXT_PERIOD_MAX,
  );
  const rawOvulationEnd = addLocalDays(
    nextPeriodUpperBound,
    -OVULATION_DAYS_BEFORE_NEXT_PERIOD_MIN,
  );
  const ovulationWindowStart = maxDate(
    firstPossiblePostPeriodDay,
    rawOvulationStart,
  );
  const ovulationWindowEnd = maxDate(
    ovulationWindowStart,
    minDate(lastPossibleCycleDay, rawOvulationEnd),
  );
  const fertileWindowStart = maxDate(
    firstPossiblePostPeriodDay,
    addLocalDays(rawOvulationStart, -FERTILE_DAYS_BEFORE_OVULATION),
  );
  const fertileWindowEnd = maxDate(
    fertileWindowStart,
    minDate(
      lastPossibleCycleDay,
      addLocalDays(rawOvulationEnd, FERTILE_DAYS_AFTER_OVULATION),
    ),
  );
  const postOvulationWindowStart = minDate(
    lastPossibleCycleDay,
    addLocalDays(ovulationWindowEnd, 1),
  );
  const postOvulationWindowEnd = maxDate(
    postOvulationWindowStart,
    minDate(lastPossibleCycleDay, addLocalDays(ovulationWindowEnd, 3)),
  );

  const currentCycleDay = options.asOf
    ? Math.max(1, daysBetween(cycleStart, options.asOf) + 1)
    : undefined;

  const phaseForDate = (date: string): DetailedCyclePhase => {
    if (date < cycleStart) return 'unknown';
    if (date <= periodEnd) return 'period';
    if (date < fertileWindowStart) return 'follicular';
    if (date < ovulationWindowStart) return 'possible_fertile';
    if (date <= ovulationWindowEnd) return 'possible_ovulation';
    if (date <= postOvulationWindowEnd) return 'possible_post_ovulation';
    return 'luteal';
  };

  const explanation = options.prediction
    ? 'Possible fertile days are estimated from your next-period window and a broad 10–16-day timing range. They can shift, especially when cycles vary.'
    : 'Possible fertile days are estimated from your cycle length using a broad timing range. Log more periods to make the period estimate more personal.';

  return {
    cycleStart,
    periodEnd,
    currentCycleDay,
    cycleLength,
    periodLength,
    nextPeriodStart,
    nextPeriodLowerBound,
    nextPeriodUpperBound,
    fertileWindowStart,
    fertileWindowEnd,
    ovulationWindowStart,
    ovulationWindowEnd,
    postOvulationWindowStart,
    postOvulationWindowEnd,
    fertileWindowCycleDayStart: Math.max(
      1,
      daysBetween(cycleStart, fertileWindowStart) + 1,
    ),
    fertileWindowCycleDayEnd: Math.max(
      1,
      daysBetween(cycleStart, fertileWindowEnd) + 1,
    ),
    ovulationWindowCycleDayStart: Math.max(
      1,
      daysBetween(cycleStart, ovulationWindowStart) + 1,
    ),
    ovulationWindowCycleDayEnd: Math.max(
      1,
      daysBetween(cycleStart, ovulationWindowEnd) + 1,
    ),
    postOvulationWindowCycleDayStart: Math.max(
      1,
      daysBetween(cycleStart, postOvulationWindowStart) + 1,
    ),
    postOvulationWindowCycleDayEnd: Math.max(
      1,
      daysBetween(cycleStart, postOvulationWindowEnd) + 1,
    ),
    confidenceBand: options.prediction?.confidenceBand ?? 'learning',
    explanation,
    phaseForDate,
  };
}

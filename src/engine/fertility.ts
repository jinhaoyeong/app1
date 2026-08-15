import type { ConfidenceBand, PeriodPrediction } from '@/types';
import { MENSTRUAL_REFERENCE } from '@/health/menstrualHealth';
import { addLocalDays, clamp, daysBetween } from '@/utils/dates';

/**
 * Cycle dates alone cannot identify an ovulation day. Luma keeps a deliberately
 * broad range visible and explains that current-cycle markers are needed for
 * fertility-awareness interpretation.
 */
export const OVULATION_DAYS_BEFORE_NEXT_PERIOD_MIN = 10;
export const OVULATION_DAYS_BEFORE_NEXT_PERIOD_MAX = 16;
export const FERTILE_DAYS_BEFORE_OVULATION =
  MENSTRUAL_REFERENCE.spermSurvivalDaysUpper;
export const FERTILE_DAYS_AFTER_OVULATION =
  MENSTRUAL_REFERENCE.eggSurvivalDaysUpper;

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
  hasPeriodEstimate: boolean;
  periodLengthKnown: boolean;
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

export function isPossibleFertileDate(
  cycleMap: Pick<CycleMap, 'fertileWindowStart' | 'fertileWindowEnd'>,
  date: string,
): boolean {
  return (
    date >= cycleMap.fertileWindowStart && date <= cycleMap.fertileWindowEnd
  );
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
      return 'Later-cycle estimate';
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
  const periodLengthKnown = typeof options.periodLength === 'number';
  const periodLength = periodLengthKnown
    ? clamp(Math.round(options.periodLength!), 1, Math.min(10, cycleLength - 2))
    : 1;
  const nextPeriodStart =
    options.prediction?.predictedStart ?? addLocalDays(cycleStart, cycleLength);
  const nextPeriodLowerBound =
    options.prediction?.lowerBound ?? nextPeriodStart;
  const nextPeriodUpperBound =
    options.prediction?.upperBound ?? nextPeriodStart;
  const hasPeriodEstimate = !!options.prediction;
  const periodEnd = addLocalDays(cycleStart, periodLength - 1);
  const firstPossibleCycleDay = cycleStart;
  const lastPossibleCycleDay = maxDate(
    firstPossibleCycleDay,
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
    firstPossibleCycleDay,
    rawOvulationStart,
  );
  const ovulationWindowEnd = maxDate(
    ovulationWindowStart,
    minDate(lastPossibleCycleDay, rawOvulationEnd),
  );
  const fertileWindowStart = maxDate(
    firstPossibleCycleDay,
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
    ? 'This calendar-only range combines your next-period window with broad biological timing. It cannot confirm ovulation; current-cycle markers such as cervical mucus, LH tests, or temperature are needed for fertility-awareness interpretation.'
    : 'Cycle dates alone cannot identify ovulation. Log more period starts before reviewing any calendar-only fertility timing.';

  return {
    cycleStart,
    periodEnd,
    currentCycleDay,
    hasPeriodEstimate,
    periodLengthKnown,
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

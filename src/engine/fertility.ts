import type { ConfidenceBand, PeriodPrediction } from '@/types';
import { addLocalDays, clamp, daysBetween } from '@/utils/dates';

/**
 * These are calendar estimates, not measurements of ovulation. The model
 * works backwards from the next-period estimate using an approximately
 * fourteen-day luteal phase, then keeps the uncertainty visible in the UI.
 */
export const OVULATION_LUTEAL_DAYS = 14;
export const FERTILE_DAYS_BEFORE_OVULATION = 5;

export type DetailedCyclePhase =
  | 'period'
  | 'follicular'
  | 'fertile'
  | 'ovulation'
  | 'day_after_ovulation'
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
  ovulationDate: string;
  dayAfterOvulationDate: string;
  ovulationCycleDay: number;
  confidenceBand: ConfidenceBand;
  explanation: string;
  phaseForDate: (date: string) => DetailedCyclePhase;
}

export function detailedPhaseLabel(phase: DetailedCyclePhase): string {
  switch (phase) {
    case 'period':
      return 'Period days';
    case 'follicular':
      return 'Follicular phase';
    case 'fertile':
      return 'Estimated fertile window';
    case 'ovulation':
      return 'Estimated ovulation day';
    case 'day_after_ovulation':
      return 'Day after estimated ovulation';
    case 'luteal':
      return 'Luteal phase';
    default:
      return 'Cycle phase not yet known';
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

  // Keep the visible ovulation date inside the current cycle even when a
  // short cycle or a wide prediction window would otherwise push it into the
  // period days. The translated window remains visible as uncertainty.
  const rawOvulationCycleDay =
    daysBetween(cycleStart, nextPeriodStart) + 1 - OVULATION_LUTEAL_DAYS;
  const ovulationCycleDay = clamp(
    rawOvulationCycleDay,
    periodLength + 2,
    cycleLength - 1,
  );
  const ovulationDate = addLocalDays(cycleStart, ovulationCycleDay - 1);
  const dayAfterOvulationDate = addLocalDays(ovulationDate, 1);
  const fertileWindowStart = addLocalDays(
    ovulationDate,
    -FERTILE_DAYS_BEFORE_OVULATION,
  );
  const fertileWindowEnd = dayAfterOvulationDate;
  const ovulationWindowStart = addLocalDays(
    nextPeriodLowerBound,
    -OVULATION_LUTEAL_DAYS,
  );
  const ovulationWindowEnd = addLocalDays(
    nextPeriodUpperBound,
    -OVULATION_LUTEAL_DAYS,
  );
  const periodEnd = addLocalDays(cycleStart, periodLength - 1);
  const currentCycleDay = options.asOf
    ? Math.max(1, daysBetween(cycleStart, options.asOf) + 1)
    : undefined;

  const phaseForDate = (date: string): DetailedCyclePhase => {
    if (date < cycleStart) return 'unknown';
    if (date <= periodEnd) return 'period';
    if (date < fertileWindowStart) return 'follicular';
    if (date < ovulationDate) return 'fertile';
    if (date === ovulationDate) return 'ovulation';
    if (date === dayAfterOvulationDate) return 'day_after_ovulation';
    return 'luteal';
  };

  const explanation = options.prediction
    ? 'Ovulation is estimated from your next-period window and an approximately 14-day luteal phase. It can shift, especially when cycles vary.'
    : 'Ovulation is estimated from your cycle length. Log more periods to make the dates more personal.';

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
    ovulationDate,
    dayAfterOvulationDate,
    ovulationCycleDay,
    confidenceBand: options.prediction?.confidenceBand ?? 'learning',
    explanation,
    phaseForDate,
  };
}

import { createId } from '@/utils/id';
import type { DailyLog, PeriodEpisode } from '@/types';
import { MEANINGFUL_FLOW } from '@/data/catalog';
import { addLocalDays, daysBetween, toLocalDateString } from '@/utils/dates';

export function isMeaningfulBleeding(flow?: string): boolean {
  return !!flow && MEANINGFUL_FLOW.has(flow);
}

/**
 * Only bleeding that could represent a natural period may create or extend a
 * cycle episode. Withdrawal, breakthrough, post-sex, and explicitly spotted
 * bleeding stay visible in the log without being mistaken for a new period.
 */
export function isCycleEligibleBleeding(
  log?: Pick<DailyLog, 'flow' | 'bleedingType'>,
): boolean {
  if (!log || !isMeaningfulBleeding(log.flow)) return false;
  return !log.bleedingType || log.bleedingType === 'natural_period';
}

/**
 * Onboarding confirms only the period start supplied by the user. A usual
 * period length must never be converted into invented daily flow records.
 */
export function createInitialCycleHistory(startDate?: string): {
  episodes: PeriodEpisode[];
  logs: Record<string, DailyLog>;
} {
  if (!startDate) return { episodes: [], logs: {} };
  return {
    episodes: [
      {
        id: createId(),
        startDate,
        endDate: undefined,
        source: 'manual',
        manuallyConfirmed: true,
      },
    ],
    logs: {},
  };
}

export function cycleDayForDate(
  date: string,
  episodes: PeriodEpisode[],
): number | undefined {
  const current = currentCycleStart(date, episodes);
  if (!current) return undefined;
  return daysBetween(current, date) + 1;
}

export function currentCycleStart(
  date: string,
  episodes: PeriodEpisode[],
): string | undefined {
  const starts = episodes
    .map((e) => e.startDate)
    .filter((d) => d <= date)
    .sort();
  return starts.length ? starts[starts.length - 1] : undefined;
}

export function completedCycleLengths(episodes: PeriodEpisode[]): number[] {
  const starts = [...episodes]
    .map((e) => e.startDate)
    .sort()
    .filter((v, i, a) => a.indexOf(v) === i);
  const lengths: number[] = [];
  for (let i = 0; i < starts.length - 1; i++) {
    const len = daysBetween(starts[i], starts[i + 1]);
    if (len >= 14 && len <= 90) lengths.push(len);
  }
  return lengths;
}

export function periodLengthDays(
  episode: PeriodEpisode,
  logs: Record<string, DailyLog>,
): number | undefined {
  if (episode.endDate) {
    return daysBetween(episode.startDate, episode.endDate) + 1;
  }
  let last = episode.startDate;
  let recordedBleeding = false;
  // Continue through a long, continuously recorded episode so summaries and
  // safety prompts do not silently truncate bleeding at 14 days. The loop is
  // bounded at the same 90-day plausibility ceiling used for cycle intervals.
  for (let i = 0; i < 90; i++) {
    const d = addLocalDays(episode.startDate, i);
    const log = logs[d];
    if (log && isCycleEligibleBleeding(log)) {
      last = d;
      recordedBleeding = true;
    } else if (
      i > 0 &&
      (!log || log.flow === 'none' || log.flow === 'spotting')
    ) {
      // allow one-day gap tolerance already handled at inference
      if (i > 1) break;
    }
  }
  return recordedBleeding
    ? daysBetween(episode.startDate, last) + 1
    : undefined;
}

/**
 * Infer / update period episodes from daily flow logs.
 * Spotting alone does not start a new cycle.
 * One-day gaps in bleeding are tolerated within an episode.
 */
export function inferPeriodEpisodes(
  existing: PeriodEpisode[],
  logs: Record<string, DailyLog>,
): PeriodEpisode[] {
  const dates = Object.keys(logs).sort();
  const bleedingDays = dates.filter((d) => isCycleEligibleBleeding(logs[d]));
  if (!bleedingDays.length) return existing.filter((e) => e.manuallyConfirmed);

  const clusters: string[][] = [];
  let current: string[] = [];

  for (const day of bleedingDays) {
    if (!current.length) {
      current = [day];
      continue;
    }
    const gap = daysBetween(current[current.length - 1], day);
    if (gap <= 2) {
      current.push(day);
    } else {
      clusters.push(current);
      current = [day];
    }
  }
  if (current.length) clusters.push(current);

  const inferred: PeriodEpisode[] = clusters.map((cluster) => {
    const startDate = cluster[0];
    const endDate = cluster[cluster.length - 1];
    const match = existing.find(
      (e) => Math.abs(daysBetween(e.startDate, startDate)) <= 1,
    );
    return {
      id: match?.id ?? createId(),
      startDate: match?.manuallyConfirmed ? match.startDate : startDate,
      endDate:
        endDate === toLocalDateString() && !logs[addLocalDays(endDate, 1)]
          ? undefined
          : endDate,
      source: match?.manuallyConfirmed ? match.source : 'inferred',
      manuallyConfirmed: match?.manuallyConfirmed ?? false,
    };
  });

  // Keep manually confirmed episodes that have no bleeding overlap yet
  for (const e of existing) {
    if (!e.manuallyConfirmed) continue;
    const has = inferred.some(
      (i) => Math.abs(daysBetween(i.startDate, e.startDate)) <= 1,
    );
    if (!has) inferred.push(e);
  }

  return inferred.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export type EstimatedPhase =
  'menstrual' | 'follicular' | 'ovulation' | 'luteal' | 'unknown';

export function estimatePhase(
  cycleDay: number | undefined,
  cycleLength: number | undefined,
  periodLength = 5,
): EstimatedPhase {
  if (!cycleDay) return 'unknown';
  if (cycleDay <= periodLength) return 'menstrual';
  const len = cycleLength ?? 28;
  const possibleOvulationStart = Math.max(periodLength + 1, len - 16);
  const possibleOvulationEnd = Math.min(len - 1, len - 10);
  if (
    cycleDay >= possibleOvulationStart &&
    cycleDay <= Math.max(possibleOvulationStart, possibleOvulationEnd)
  ) {
    return 'ovulation';
  }
  if (cycleDay < possibleOvulationStart) return 'follicular';
  return 'luteal';
}

export function phaseLabel(phase: EstimatedPhase): string {
  switch (phase) {
    case 'menstrual':
      return 'During your period';
    case 'follicular':
      return 'After your period. Your body is preparing again';
    case 'ovulation':
      return 'Possible ovulation timing (estimated)';
    case 'luteal':
      return 'In the days before your next period';
    default:
      return 'Still learning where you are in your cycle';
  }
}

export function phaseShortLabel(phase: EstimatedPhase): string {
  switch (phase) {
    case 'menstrual':
      return 'Period';
    case 'follicular':
      return 'After period';
    case 'ovulation':
      return 'Mid-cycle';
    case 'luteal':
      return 'Before period';
    default:
      return 'Learning';
  }
}

/**
 * Neutral cycle wording for places where ovulation has not been measured or
 * calendar fertility timing is hidden. A cycle day is observable from a
 * recorded period start; a hormonal phase is not.
 */
export function neutralCycleTimingLabel(options: {
  cycleDay?: number;
  bleedingRecorded: boolean;
}): string {
  if (options.bleedingRecorded) return 'Period bleeding recorded today';
  if (options.cycleDay) {
    return `Cycle day ${options.cycleDay} from your last recorded period start`;
  }
  return 'Cycle timing is still learning from your recorded period starts';
}

/**
 * Position relative to next/current period for pattern matching.
 * Negative = days before period start; positive = day of bleeding onward.
 */
export function relativeToPeriod(
  date: string,
  episodes: PeriodEpisode[],
): number | undefined {
  const starts = episodes.map((e) => e.startDate).sort();
  if (!starts.length) return undefined;

  const next = starts.find((s) => s >= date);
  const prev = [...starts].reverse().find((s) => s <= date);

  if (prev && daysBetween(prev, date) <= 10) {
    return daysBetween(prev, date) + 1; // day +1 of period
  }
  if (next) {
    return -daysBetween(date, next);
  }
  return undefined;
}

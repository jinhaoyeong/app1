import { createId } from '@/utils/id';
import type { DailyLog, PeriodEpisode } from '@/types';
import { MEANINGFUL_FLOW } from '@/data/catalog';
import { addLocalDays, daysBetween, toLocalDateString } from '@/utils/dates';

export function isMeaningfulBleeding(flow?: string): boolean {
  return !!flow && MEANINGFUL_FLOW.has(flow);
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
  for (let i = 0; i < 14; i++) {
    const d = addLocalDays(episode.startDate, i);
    const log = logs[d];
    if (log && isMeaningfulBleeding(log.flow)) {
      last = d;
    } else if (i > 0 && (!log || log.flow === 'none' || log.flow === 'spotting')) {
      // allow one-day gap tolerance already handled at inference
      if (i > 1) break;
    }
  }
  return daysBetween(episode.startDate, last) + 1;
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
  const bleedingDays = dates.filter((d) => isMeaningfulBleeding(logs[d]?.flow));
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
  | 'menstrual'
  | 'follicular'
  | 'ovulation'
  | 'luteal'
  | 'unknown';

export function estimatePhase(
  cycleDay: number | undefined,
  cycleLength: number | undefined,
  periodLength = 5,
): EstimatedPhase {
  if (!cycleDay) return 'unknown';
  if (cycleDay <= periodLength) return 'menstrual';
  const len = cycleLength ?? 28;
  const ovulationDay = Math.max(periodLength + 1, len - 14);
  if (cycleDay >= ovulationDay - 1 && cycleDay <= ovulationDay + 1) {
    return 'ovulation';
  }
  if (cycleDay < ovulationDay) return 'follicular';
  return 'luteal';
}

export function phaseLabel(phase: EstimatedPhase): string {
  switch (phase) {
    case 'menstrual':
      return 'Menstrual phase';
    case 'follicular':
      return 'Follicular phase';
    case 'ovulation':
      return 'Around estimated ovulation';
    case 'luteal':
      return 'Luteal phase';
    default:
      return 'Learning your cycle';
  }
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

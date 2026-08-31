import type { DailyLog, PeriodEpisode, PersonalPattern } from '@/types';
import {
  ENERGY_OPTIONS,
  FLOW_OPTIONS,
  MOOD_OPTIONS,
  PAIN_OPTIONS,
  SYMPTOM_LIBRARY,
} from '@/data/catalog';
import { addLocalDays, daysBetween } from '@/utils/dates';
import { relativeToPeriod } from './cycle';
import { patternMeta } from './patterns';

/**
 * The period-relative convention used by `detectPatterns`:
 *   1–11  = days from the last recorded start (start itself is 1)
 *   ≤ 0   = days until the next expected start (0 is that start)
 *
 * A late cycle day past the expected length is not mapped onto the
 * pre-period window — being overdue is not the same as being "before".
 */
export function relativeFromCycleDay(
  cycleDay: number,
  expectedLength: number,
): number | undefined {
  if (cycleDay < 1) return undefined;
  if (cycleDay <= 11) return cycleDay;
  if (cycleDay > expectedLength) return undefined;
  return -(expectedLength - cycleDay + 1);
}

export function cycleDayFromRelative(
  rel: number,
  expectedLength: number,
): number {
  if (rel > 0) return Math.min(expectedLength, rel);
  if (rel === 0) return 1;
  return Math.min(expectedLength, Math.max(1, expectedLength + rel + 1));
}

export function logHasRecord(log?: DailyLog): boolean {
  if (!log) return false;
  return Boolean(
    log.flow ||
    log.mood ||
    log.energy ||
    (log.pain && log.pain !== 'none') ||
    (log.symptoms && log.symptoms.length) ||
    log.note ||
    log.sleepHours !== undefined ||
    log.lhTest ||
    log.mucus ||
    log.sexualActivity ||
    log.functionalImpact,
  );
}

function optionLabel<T extends string>(
  options: readonly { value: T; label: string }[],
  value?: T,
): string | undefined {
  if (!value) return undefined;
  return options.find((o) => o.value === value)?.label;
}

function symptomLabel(code: string): string {
  return SYMPTOM_LIBRARY.find((s) => s.code === code)?.label ?? code;
}

export function summarizeLog(log: DailyLog): string {
  const bits: string[] = [];
  const flow = optionLabel(FLOW_OPTIONS, log.flow);
  if (flow && log.flow !== 'none') bits.push(`${flow.toLowerCase()} flow`);
  const mood = optionLabel(MOOD_OPTIONS, log.mood);
  if (mood) bits.push(`mood ${mood.toLowerCase()}`);
  const energy = optionLabel(ENERGY_OPTIONS, log.energy);
  if (energy) bits.push(`energy ${energy.toLowerCase()}`);
  const pain = optionLabel(PAIN_OPTIONS, log.pain);
  if (pain && log.pain !== 'none') bits.push(`${pain.toLowerCase()} pain`);
  for (const code of log.symptoms ?? []) {
    bits.push(symptomLabel(code).toLowerCase());
  }
  if (log.note?.trim()) bits.push('a note');
  if (log.sleepHours !== undefined) bits.push(`${log.sleepHours} hours sleep`);
  if (log.lhTest === 'positive') bits.push('LH test positive');
  if (log.lhTest === 'negative') bits.push('LH test negative');
  if (log.lhTest === 'unclear') bits.push('LH test unclear');
  if (log.mucus && log.mucus !== 'none') {
    bits.push(`${log.mucus.split('_').join(' ')} mucus`);
  }
  if (log.functionalImpact === 'some') {
    bits.push('a little impact on usual activities');
  } else if (log.functionalImpact === 'significant') {
    bits.push('usual activities were affected');
  }
  return bits.join(' · ');
}

export type DialHistoryItem = {
  key: string;
  label: string;
  support: number;
  total: number;
};

export type DialDayReading = {
  day: number;
  date?: string;
  isFuture: boolean;
  isToday: boolean;
  log?: DailyLog;
  logSummary?: string;
  patterns: PersonalPattern[];
  history: DialHistoryItem[];
  /** Hedged line under the usual-pattern block. */
  patternNote: string;
};

export type CycleDialModel = {
  loggedDays: number[];
  patternDays: number[];
  readingFor: (day: number) => DialDayReading;
};

function uniqueStarts(episodes: PeriodEpisode[]): string[] {
  return [...episodes]
    .map((e) => e.startDate)
    .sort()
    .filter((v, i, a) => a.indexOf(v) === i);
}

function nextStartAfter(starts: string[], start: string): string | undefined {
  return starts.find((s) => s > start);
}

/**
 * Bind a cycle day on the dial to the logs and patterns already on file, so
 * gliding the handle reads a real history rather than a coloured ring.
 */
export function buildCycleDialModel(options: {
  cycleStart?: string;
  /** Visible ring length, including a late current cycle. */
  cycleLength: number;
  /** Typical / estimated length used to place pre-period windows. */
  expectedLength: number;
  asOf: string;
  logs: Record<string, DailyLog>;
  episodes: PeriodEpisode[];
  patterns: PersonalPattern[];
}): CycleDialModel {
  const cycleLength = Math.max(1, Math.round(options.cycleLength));
  const expectedLength = Math.max(14, Math.round(options.expectedLength));
  const starts = uniqueStarts(options.episodes);
  const cycleStart = options.cycleStart;
  const asOf = options.asOf;

  const loggedDays: number[] = [];
  if (cycleStart) {
    for (let day = 1; day <= cycleLength; day++) {
      const date = addLocalDays(cycleStart, day - 1);
      if (logHasRecord(options.logs[date])) loggedDays.push(day);
    }
  }

  const patternDays = new Set<number>();
  for (const pattern of options.patterns) {
    if (pattern.windowStart === undefined || pattern.windowEnd === undefined) {
      continue;
    }
    for (let rel = pattern.windowStart; rel <= pattern.windowEnd; rel++) {
      patternDays.add(cycleDayFromRelative(rel, expectedLength));
    }
  }

  const readingFor = (day: number): DialDayReading => {
    const safeDay = Math.min(cycleLength, Math.max(1, day));
    const date = cycleStart ? addLocalDays(cycleStart, safeDay - 1) : undefined;
    const isToday = !!date && date === asOf;
    const isFuture = !!date && date > asOf;
    const log =
      date && logHasRecord(options.logs[date]) ? options.logs[date] : undefined;

    const relFromDate =
      date && options.episodes.length
        ? relativeToPeriod(date, options.episodes)
        : undefined;
    const rel = relFromDate ?? relativeFromCycleDay(safeDay, expectedLength);

    const patterns = options.patterns.filter((p) => {
      if (
        rel === undefined ||
        p.windowStart === undefined ||
        p.windowEnd === undefined
      ) {
        return false;
      }
      return rel >= p.windowStart && rel <= p.windowEnd;
    });

    const history = historyForCycleDay({
      day: safeDay,
      asOf,
      starts,
      logs: options.logs,
    });

    let patternNote: string;
    if (patterns.length) {
      patternNote = `${patternMeta(patterns[0])}. Entries, not a cause.`;
    } else if (history.length) {
      const top = history[0];
      patternNote =
        top.support >= 2
          ? `This cycle day in ${top.support} of ${top.total} — a pattern taking shape, not a diagnosis.`
          : `This cycle day in ${top.support} of ${top.total}.`;
    } else if (starts.length < 2) {
      patternNote = 'A named pattern needs to repeat across cycles.';
    } else {
      patternNote = 'Nothing repeating on this cycle day yet.';
    }

    return {
      day: safeDay,
      date,
      isFuture,
      isToday,
      log,
      logSummary: log ? summarizeLog(log) : undefined,
      patterns,
      history,
      patternNote,
    };
  };

  return {
    loggedDays,
    patternDays: [...patternDays].sort((a, b) => a - b),
    readingFor,
  };
}

function historyForCycleDay(options: {
  day: number;
  asOf: string;
  starts: string[];
  logs: Record<string, DailyLog>;
}): DialHistoryItem[] {
  const { day, asOf, starts, logs } = options;
  const counts = new Map<string, { label: string; support: number }>();
  let total = 0;

  for (const start of starts) {
    const date = addLocalDays(start, day - 1);
    const next = nextStartAfter(starts, start);
    if (next && daysBetween(start, next) < day) continue;
    if (date > asOf) continue;
    total += 1;
    const log = logs[date];
    if (!logHasRecord(log)) continue;

    const bump = (key: string, label: string) => {
      const entry = counts.get(key) ?? { label, support: 0 };
      entry.support += 1;
      counts.set(key, entry);
    };

    if (log.mood) {
      bump(
        `mood:${log.mood}`,
        `mood ${optionLabel(MOOD_OPTIONS, log.mood)?.toLowerCase()}`,
      );
    }
    if (log.energy) {
      bump(
        `energy:${log.energy}`,
        `energy ${optionLabel(ENERGY_OPTIONS, log.energy)?.toLowerCase()}`,
      );
    }
    if (log.pain && log.pain !== 'none') {
      bump(
        `pain:${log.pain}`,
        `${optionLabel(PAIN_OPTIONS, log.pain)?.toLowerCase()} pain`,
      );
    }
    if (log.flow && log.flow !== 'none') {
      bump(
        `flow:${log.flow}`,
        `${optionLabel(FLOW_OPTIONS, log.flow)?.toLowerCase()} flow`,
      );
    }
    for (const code of log.symptoms ?? []) {
      bump(`symptom:${code}`, symptomLabel(code).toLowerCase());
    }
  }

  if (total === 0) return [];

  return [...counts.entries()]
    .map(([key, value]) => ({
      key,
      label: value.label,
      support: value.support,
      total,
    }))
    .sort((a, b) => b.support - a.support || a.label.localeCompare(b.label))
    .slice(0, 3);
}

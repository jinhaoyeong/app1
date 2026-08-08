import type {
  DailyLog,
  HealthSummary,
  PeriodEpisode,
  CycleSummaryRow,
} from '@/types';
import { SYMPTOM_LIBRARY } from '@/data/catalog';
import { periodLengthDays } from './cycle';
import {
  addLocalDays,
  daysBetween,
  mean,
  subtractCalendarMonths,
  toLocalDateString,
} from '@/utils/dates';
import { baselineFromCycles } from './prediction';
import { detectChanges } from './changes';

export function buildCycleComparison(
  episodes: PeriodEpisode[],
  logs: Record<string, DailyLog>,
): CycleSummaryRow[] {
  const starts = [...episodes]
    .map((e) => e.startDate)
    .sort()
    .filter((v, i, a) => a.indexOf(v) === i);

  const rows: CycleSummaryRow[] = [];
  for (let i = 0; i < starts.length; i++) {
    const startDate = starts[i];
    const endDate = starts[i + 1] ? addLocalDays(starts[i + 1], -1) : undefined;
    const length = starts[i + 1]
      ? daysBetween(starts[i], starts[i + 1])
      : undefined;
    const episode = episodes.find((e) => e.startDate === startDate)!;
    const periodLength = periodLengthDays(episode, logs);

    rows.push({
      startDate,
      endDate,
      length,
      periodLength,
      mainDifference: 'No comparison yet',
    });
  }

  // Each cycle is described against the average of the user's own completed
  // cycles rather than against the single previous one, which is too noisy to
  // call a change. (A dead branch here once suggested a prior-cycle
  // comparison; it never ran, and this is the comparison that ships.)
  const completed = rows.filter((r) => r.length);
  const avgLen = mean(completed.map((r) => r.length!));
  return rows
    .slice()
    .reverse()
    .slice(0, 6)
    .map((r) => {
      if (!r.length || !avgLen) {
        return {
          ...r,
          mainDifference: r.length ? 'No comparison yet' : 'In progress',
        };
      }
      const delta = r.length - avgLen;
      let mainDifference = 'Normal';
      if (Math.abs(delta) <= 1.5) mainDifference = 'Normal';
      else if (delta > 1.5) mainDifference = 'Longer cycle';
      else mainDifference = 'Shorter cycle';

      // Symptom flavour
      const periodDays = Array.from({ length: r.periodLength ?? 5 }, (_, i) =>
        addLocalDays(r.startDate, i),
      );
      const preDays = Array.from({ length: 4 }, (_, i) =>
        addLocalDays(r.startDate, -(i + 1)),
      );
      const window = [...preDays, ...periodDays];
      const moods = window.map((d) => logs[d]?.mood).filter(Boolean);
      const pains = window.map((d) => logs[d]?.pain).filter(Boolean);
      if (moods.filter((m) => m === 'low' || m === 'rough').length >= 2) {
        mainDifference = 'Low mood';
      } else if (
        pains.filter((p) => p === 'moderate' || p === 'severe').length >= 2
      ) {
        mainDifference = 'More cramps';
      }
      return { ...r, mainDifference };
    });
}

export function buildHealthSummary(options: {
  episodes: PeriodEpisode[];
  logs: Record<string, DailyLog>;
  months: 3 | 6 | 12;
}): HealthSummary {
  const asOf = toLocalDateString();
  // A "6 month" summary a clinician reads must mean six calendar months, not
  // 180 days. Those differ by up to five days, which is enough to include or
  // drop a whole cycle at the boundary.
  const cutoff = subtractCalendarMonths(asOf, options.months);
  const episodes = options.episodes.filter((e) => e.startDate >= cutoff);
  const logs: Record<string, DailyLog> = {};
  for (const [d, log] of Object.entries(options.logs)) {
    if (d >= cutoff) logs[d] = log;
  }

  const baseline = baselineFromCycles(episodes);
  const periodLens = episodes
    .map((e) => periodLengthDays(e, logs))
    .filter((n): n is number => typeof n === 'number');

  // Symptom frequency is counted in *cycles*, not logged days, so that it can
  // be reported against a cycle denominator without mixing units.
  const symptomCycles = new Map<string, Set<number>>();
  let lowMoodCycles = 0;
  let painCycles = 0;
  const starts = episodes.map((e) => e.startDate).sort();

  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    // Windows must be mutually exclusive. The previous form ran from five days
    // before the start to the next start inclusive, so the days around every
    // boundary were counted in two adjacent cycles.
    const next = starts[i + 1];
    const end = next ? addLocalDays(next, -1) : asOf;
    let hadLowMood = false;
    let hadPain = false;
    for (const [d, log] of Object.entries(logs)) {
      if (d < start || d > end) continue;
      for (const s of log.symptoms ?? []) {
        const seen = symptomCycles.get(s) ?? new Set<number>();
        seen.add(i);
        symptomCycles.set(s, seen);
      }
      if (log.mood === 'low' || log.mood === 'rough') hadLowMood = true;
      if (log.pain === 'moderate' || log.pain === 'severe') hadPain = true;
    }
    if (hadLowMood) lowMoodCycles++;
    if (hadPain) painCycles++;
  }

  const totalCycles = Math.max(1, starts.length);
  const commonSymptoms = [...symptomCycles.entries()]
    .map(([code, cycles]) => ({
      code,
      label: SYMPTOM_LIBRARY.find((s) => s.code === code)?.label ?? code,
      count: Math.min(cycles.size, totalCycles),
      total: totalCycles,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const changes = detectChanges({ episodes, logs, asOf }).map((c) => c.title);

  return {
    months: options.months,
    generatedAt: new Date().toISOString(),
    averageCycle: baseline.averageCycleLength,
    cycleRange: baseline.cycleLengthRange,
    averageBleeding: periodLens.length
      ? Math.round((mean(periodLens) ?? 0) * 10) / 10
      : undefined,
    painSummary:
      starts.length > 0
        ? `Moderate/severe pain reported during ${painCycles} of ${starts.length} cycles.`
        : undefined,
    moodSummary:
      starts.length > 0
        ? `Lower mood logged around menstruation during ${lowMoodCycles} of ${starts.length} cycles.`
        : undefined,
    commonSymptoms,
    changes,
  };
}

export function exportLogsJson(options: {
  episodes: PeriodEpisode[];
  logs: Record<string, DailyLog>;
  profile: unknown;
}): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      format: 'luma_export_v1',
      profile: options.profile,
      periodEpisodes: options.episodes,
      dailyLogs: Object.values(options.logs),
    },
    null,
    2,
  );
}

/**
 * RFC 4180 escaping applied to every cell rather than just the note field, so
 * a future column containing a comma, quote, or newline cannot silently shift
 * every value in a clinician's spreadsheet by one column.
 */
function csvCell(value: string | number | undefined): string {
  const s = value === undefined || value === null ? '' : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportLogsCsv(logs: Record<string, DailyLog>): string {
  const header = 'date,flow,mood,energy,pain,symptoms,sleepHours,note';
  const rows = Object.values(logs)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((l) =>
      [
        l.date,
        l.flow,
        l.mood,
        l.energy,
        l.pain,
        (l.symptoms ?? []).join('|'),
        l.sleepHours,
        l.note,
      ]
        .map(csvCell)
        .join(','),
    );
  // CRLF line endings: Excel is the most likely destination.
  return [header, ...rows].join('\r\n');
}

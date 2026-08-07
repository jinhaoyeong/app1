import type {
  DailyLog,
  HealthSummary,
  PeriodEpisode,
  CycleSummaryRow,
} from '@/types';
import { SYMPTOM_LIBRARY } from '@/data/catalog';
import {
  completedCycleLengths,
  periodLengthDays,
} from './cycle';
import { addLocalDays, daysBetween, mean, toLocalDateString } from '@/utils/dates';
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

    let mainDifference = '—';
    if (i > 0 && length && rows[0]?.length) {
      // compare to previous completed
    }
    rows.push({
      startDate,
      endDate,
      length,
      periodLength,
      mainDifference,
    });
  }

  // Annotate differences vs median of completed
  const completed = rows.filter((r) => r.length);
  const avgLen = mean(completed.map((r) => r.length!));
  return rows
    .slice()
    .reverse()
    .slice(0, 6)
    .map((r) => {
      if (!r.length || !avgLen) return { ...r, mainDifference: r.length ? '—' : 'In progress' };
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
      } else if (pains.filter((p) => p === 'moderate' || p === 'severe').length >= 2) {
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
  const cutoff = addLocalDays(asOf, -(options.months * 30));
  const episodes = options.episodes.filter((e) => e.startDate >= cutoff);
  const logs: Record<string, DailyLog> = {};
  for (const [d, log] of Object.entries(options.logs)) {
    if (d >= cutoff) logs[d] = log;
  }

  const baseline = baselineFromCycles(episodes);
  const lengths = completedCycleLengths(episodes);
  const periodLens = episodes
    .map((e) => periodLengthDays(e, logs))
    .filter((n): n is number => typeof n === 'number');

  const symptomCounts = new Map<string, number>();
  let lowMoodCycles = 0;
  let painCycles = 0;
  const starts = episodes.map((e) => e.startDate).sort();

  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    const end = starts[i + 1] ?? asOf;
    let hadLowMood = false;
    let hadPain = false;
    for (const [d, log] of Object.entries(logs)) {
      if (d < addLocalDays(start, -5) || d > end) continue;
      for (const s of log.symptoms ?? []) {
        symptomCounts.set(s, (symptomCounts.get(s) ?? 0) + 1);
      }
      if (log.mood === 'low' || log.mood === 'rough') hadLowMood = true;
      if (log.pain === 'moderate' || log.pain === 'severe') hadPain = true;
    }
    if (hadLowMood) lowMoodCycles++;
    if (hadPain) painCycles++;
  }

  const totalCycles = Math.max(1, starts.length);
  const commonSymptoms = [...symptomCounts.entries()]
    .map(([code, count]) => ({
      code,
      label: SYMPTOM_LIBRARY.find((s) => s.code === code)?.label ?? code,
      count,
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

export function exportLogsCsv(logs: Record<string, DailyLog>): string {
  const header =
    'date,flow,mood,energy,pain,symptoms,sleepHours,note';
  const rows = Object.values(logs)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((l) =>
      [
        l.date,
        l.flow ?? '',
        l.mood ?? '',
        l.energy ?? '',
        l.pain ?? '',
        (l.symptoms ?? []).join('|'),
        l.sleepHours ?? '',
        `"${(l.note ?? '').replace(/"/g, '""')}"`,
      ].join(','),
    );
  return [header, ...rows].join('\n');
}

import { createId } from '@/utils/id';
import type {
  ChangeInsight,
  DailyLog,
  PeriodEpisode,
  SafetyLevel,
} from '@/types';
import {
  completedCycleLengths,
  currentCycleStart,
  periodLengthDays,
  isCycleEligibleBleeding,
} from './cycle';
import {
  addLocalDays,
  daysBetween,
  mean,
  toLocalDateString,
} from '@/utils/dates';
import { baselineFromCycles } from './prediction';

/** "Lately" for a pain streak means the last two weeks of calendar time. */
const RECENT_PAIN_WINDOW_DAYS = 14;

export function detectChanges(options: {
  episodes: PeriodEpisode[];
  logs: Record<string, DailyLog>;
  asOf?: string;
}): ChangeInsight[] {
  const asOf = options.asOf ?? toLocalDateString();
  const { episodes, logs } = options;
  const lengths = completedCycleLengths(episodes);
  const baseline = baselineFromCycles(episodes);
  const changes: ChangeInsight[] = [];

  if (lengths.length < 3) return changes;

  const start = currentCycleStart(asOf, episodes);
  if (start) {
    const currentLen = daysBetween(start, asOf) + 1;
    const avg = baseline.averageCycleLength ?? mean(lengths)!;
    const range = baseline.cycleLengthRange ?? [
      Math.min(...lengths),
      Math.max(...lengths),
    ];

    if (currentLen > range[1] + 3 && currentLen > avg + 5) {
      changes.push({
        id: createId(),
        kind: 'cycle_long',
        title: 'This cycle is running longer than usual',
        body: `Your current cycle is already ${currentLen} days. Your previous ${lengths.length} cycles ranged from ${range[0]}-${range[1]} days.\n\nCycle length can change for many reasons, including stress, lifestyle changes, medication, pregnancy and health conditions.\n\nIf this continues or concerns you, consider speaking with a healthcare professional.`,
        safetyLevel: 3,
      });
    }
  }

  // Completed cycle outliers
  if (lengths.length >= 3) {
    const last = lengths[lengths.length - 1];
    const prior = lengths.slice(0, -1);
    const priorAvg = mean(prior)!;
    const priorRange: [number, number] = [
      Math.min(...prior),
      Math.max(...prior),
    ];
    if (last > priorRange[1] + 3 || last > priorAvg + 7) {
      changes.push({
        id: createId(),
        kind: 'completed_cycle_long',
        title: 'This cycle looks different',
        body: `Your cycle lasted ${last} days. Your previous cycles ranged from ${priorRange[0]}-${priorRange[1]} days.\n\nThere are many possible reasons for cycle changes. If this continues or concerns you, consider speaking with a healthcare professional.`,
        safetyLevel: 2,
      });
    }
    if (last < priorRange[0] - 3 || last < priorAvg - 7) {
      changes.push({
        id: createId(),
        kind: 'completed_cycle_short',
        title: 'This cycle was shorter than usual',
        body: `Your cycle lasted ${last} days. Your recent cycles were typically around ${Math.round(priorAvg)} days.\n\nIf short cycles continue or you feel unwell, consider medical advice.`,
        safetyLevel: 2,
      });
    }
  }

  // Bleeding length change
  const recentEpisodes = episodes.slice(-4);
  const periodLens = recentEpisodes
    .map((e) => periodLengthDays(e, logs))
    .filter((n): n is number => typeof n === 'number');
  if (periodLens.length >= 3) {
    const last = periodLens[periodLens.length - 1];
    const prior = periodLens.slice(0, -1);
    const avg = mean(prior)!;
    if (last >= avg + 3 && last >= 8) {
      changes.push({
        id: createId(),
        kind: 'bleeding_long',
        title: 'Your bleeding pattern changed',
        body: `You normally report about ${Math.round(avg)} days of bleeding. This cycle you have logged bleeding for ${last} days.\n\nIf prolonged bleeding continues or you feel unwell, consider medical advice.`,
        safetyLevel: 3,
      });
    }
  }

  // Severe pain streak (gentle, not alarming).
  //
  // This window must be calendar days, not the last ten *logged* entries:
  // with sparse logging, "the last ten entries" can span months, so three
  // severe-pain days from different seasons would read as a current streak
  // and raise a level-3 safety message that is not true.
  const windowStart = addLocalDays(asOf, -RECENT_PAIN_WINDOW_DAYS);
  const recentDates = Object.keys(logs)
    .filter((d) => d > windowStart && d <= asOf)
    .sort();
  const severeDays = recentDates.filter((d) => logs[d]?.pain === 'severe');
  if (severeDays.length >= 3) {
    changes.push({
      id: createId(),
      kind: 'severe_pain',
      title: 'Pain has been stronger lately',
      body: `You've logged severe pain on ${severeDays.length} recent days.\n\nIf pain is unusually severe, worsening, or interfering significantly with everyday life, consider seeking medical advice.`,
      safetyLevel: 3,
    });
  }

  // Very heavy bleeding days
  const heavyDays = recentDates.filter(
    (d) => logs[d]?.flow === 'very_heavy' || logs[d]?.flow === 'heavy',
  );
  if (heavyDays.filter((d) => logs[d]?.flow === 'very_heavy').length >= 3) {
    changes.push({
      id: createId(),
      kind: 'heavy_bleeding',
      title: 'Bleeding has been heavier than usual to watch',
      body: `You've recorded very heavy bleeding on several recent days.\n\nIf bleeding soaks through protection quickly, includes large clots, or you feel faint or unwell, consider healthcare support.`,
      safetyLevel: 3,
    });
  }

  return dedupeByKind(changes);
}

function dedupeByKind(items: ChangeInsight[]): ChangeInsight[] {
  const seen = new Set<string>();
  return items.filter((i) => {
    if (seen.has(i.kind)) return false;
    seen.add(i.kind);
    return true;
  });
}

export function safetyFooter(level: SafetyLevel): string | undefined {
  if (level >= 3) {
    return 'This pattern may be worth discussing with a healthcare professional. Luma cannot diagnose health conditions.';
  }
  return undefined;
}

export function hasBleedingToday(
  logs: Record<string, DailyLog>,
  date = toLocalDateString(),
): boolean {
  return isCycleEligibleBleeding(logs[date]);
}

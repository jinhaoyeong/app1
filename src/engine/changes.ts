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
import { MENSTRUAL_REFERENCE } from '@/health/menstrualHealth';

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

  // Personal-baseline comparisons require enough history. Acute bleeding and
  // pain review prompts below do not: a new user deserves the same safety
  // boundary as someone with years of data.
  if (lengths.length >= 3) {
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
          title: 'This cycle is running longer than your recent pattern',
          body: `Your current cycle is already ${currentLen} days. Your previous ${lengths.length} cycles ranged from ${range[0]}-${range[1]} days.\n\nA late period has many possible explanations, and a calendar cannot rule out pregnancy. If pregnancy is possible, consider a test at the appropriate time. If the change continues or concerns you, contact a healthcare professional.`,
          safetyLevel: 3,
        });
      }
    }

    // Completed cycle outliers
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
  if (periodLens.length > 0) {
    const last = periodLens[periodLens.length - 1];
    const prior = periodLens.slice(0, -1);
    const avg = prior.length ? mean(prior) : undefined;
    if (last > MENSTRUAL_REFERENCE.periodDaysUpperReviewPoint) {
      changes.push({
        id: createId(),
        kind: 'bleeding_long',
        title: 'Bleeding has been recorded for more than 7 days',
        body: `${
          avg !== undefined && last >= avg + 3
            ? `You previously reported about ${Math.round(avg)} days of bleeding. `
            : ''
        }This episode includes ${last} days of period-type bleeding. Bleeding beyond 7 days is a reason to contact a healthcare professional, especially if it is heavy, worsening, or making you feel unwell.`,
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
  if (severeDays.length >= 1) {
    changes.push({
      id: createId(),
      kind: 'severe_pain',
      title: 'Severe pain deserves attention',
      body: `You've logged severe pain on ${severeDays.length} recent day${severeDays.length === 1 ? '' : 's'}. Severe, worsening, or activity-limiting period or pelvic pain should be discussed with a healthcare professional. Seek urgent care for sudden severe pain, fainting, shoulder pain, or possible pregnancy with unusual bleeding or pelvic pain.`,
      safetyLevel: 3,
    });
  }

  // Very heavy bleeding days
  const heavyDays = recentDates.filter(
    (d) => logs[d]?.flow === 'very_heavy' || logs[d]?.flow === 'heavy',
  );
  const veryHeavyDays = heavyDays.filter((d) => logs[d]?.flow === 'very_heavy');
  if (veryHeavyDays.length >= 1) {
    changes.push({
      id: createId(),
      kind: 'heavy_bleeding',
      title: 'You recorded very heavy bleeding',
      body: `A flow label cannot measure blood loss. If you are soaking a pad or tampon about every hour for more than 2 hours and also feel dizzy or lightheaded, short of breath, or have chest pain, seek emergency medical care now. Contact a healthcare professional for heavy bleeding, large clots, or bleeding that disrupts daily life.`,
      safetyLevel: 3,
    });
  }

  const postSexBleeding = recentDates.filter(
    (d) => logs[d]?.bleedingType === 'post_sex',
  );
  if (postSexBleeding.length >= 1) {
    changes.push({
      id: createId(),
      kind: 'post_sex_bleeding',
      title: 'Bleeding after sex was recorded',
      body: 'Bleeding after sex should be discussed with a healthcare professional, especially if it recurs, is heavy, or comes with pain.',
      safetyLevel: 3,
    });
  }

  const priority: Record<string, number> = {
    heavy_bleeding: 100,
    severe_pain: 95,
    post_sex_bleeding: 90,
    bleeding_long: 85,
    cycle_long: 60,
    completed_cycle_long: 50,
    completed_cycle_short: 50,
  };
  return dedupeByKind(changes).sort(
    (a, b) => (priority[b.kind] ?? 0) - (priority[a.kind] ?? 0),
  );
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

import { createId } from '@/utils/id';
import type {
  DailyLog,
  EnergyLevel,
  MoodLevel,
  PatternStrength,
  PeriodEpisode,
  PeriodPrediction,
  PersonalPattern,
} from '@/types';
import { SYMPTOM_LIBRARY } from '@/data/catalog';
import { relativeToPeriod, completedCycleLengths } from './cycle';

function strengthFromSupport(support: number, total: number): PatternStrength {
  if (total < 2 || support < 2) return 'insufficient';
  const ratio = support / total;
  if (support >= 5 && ratio >= 0.8) return 'strong';
  if (support >= 3 && ratio >= 0.6) return 'repeating';
  if (support >= 2 && ratio >= 0.5) return 'possible';
  return 'insufficient';
}

function symptomLabel(code: string): string {
  return SYMPTOM_LIBRARY.find((s) => s.code === code)?.label ?? code;
}

/** Symptom names that are grammatically plural, so the verb has to agree. */
const PLURAL_SYMPTOMS = new Set([
  'cramps',
  'cravings',
  'mood_swings',
  'chills',
]);

function appearsVerb(code: string): string {
  return PLURAL_SYMPTOMS.has(code) ? 'appear' : 'appears';
}

/**
 * Detect repeating pre-period / period-timed symptom patterns.
 * Deterministic. LLM is not used for detection.
 */
export function detectPatterns(
  episodes: PeriodEpisode[],
  logs: Record<string, DailyLog>,
): PersonalPattern[] {
  const lengths = completedCycleLengths(episodes);
  const cycleCount = Math.max(
    lengths.length,
    episodes.length > 0 ? episodes.length - 1 : 0,
  );
  if (cycleCount < 2) return [];

  const starts = [...episodes]
    .map((e) => e.startDate)
    .sort()
    .filter((v, i, a) => a.indexOf(v) === i);

  // Consider last 6 cycle starts that have a following period (completed) or current
  const recentStarts = starts.slice(-7);
  const patterns: PersonalPattern[] = [];

  const symptomHits = new Map<
    string,
    { rels: number[]; cycles: Set<string> }
  >();
  const lowEnergyCycles = new Set<string>();
  const lowMoodCycles = new Set<string>();
  const crampCycles = new Map<string, number[]>();

  for (const [date, log] of Object.entries(logs)) {
    const rel = relativeToPeriod(date, episodes);
    if (rel === undefined) continue;
    // Focus on -7..+5 window around period
    if (rel < -7 || rel > 5) continue;

    // A log before the first known period cannot be attributed to a cycle.
    // Falling back to the date itself minted a unique key per day, which
    // inflated support counts into claims like "8 of 5 cycles".
    const cycleKey = starts
      .filter((s) => s <= date)
      .sort()
      .slice(-1)[0];
    if (!cycleKey) continue;

    for (const code of log.symptoms ?? []) {
      const entry = symptomHits.get(code) ?? { rels: [], cycles: new Set() };
      entry.rels.push(rel);
      entry.cycles.add(cycleKey);
      symptomHits.set(code, entry);
    }

    if (log.energy === 'very_low' || log.energy === 'low') {
      if (rel >= -5 && rel <= 0) lowEnergyCycles.add(cycleKey);
    }
    if (log.mood === 'low' || log.mood === 'rough') {
      if (rel >= -4 && rel <= 0) lowMoodCycles.add(cycleKey);
    }
    if (
      log.pain &&
      log.pain !== 'none' &&
      (log.painLocations?.includes('cramps') ||
        log.symptoms?.includes('cramps'))
    ) {
      const arr = crampCycles.get(cycleKey) ?? [];
      arr.push(rel);
      crampCycles.set(cycleKey, arr);
    }
  }

  const totalCycles = Math.min(
    6,
    Math.max(cycleCount, recentStarts.length - 1 || 1),
  );
  // Support is a count of cycles, so it can never exceed the cycles observed.
  // Guarding here keeps every "n of m cycles" sentence true by construction.
  const cappedSupport = (cycles: number) => Math.min(cycles, totalCycles);

  for (const [code, data] of symptomHits) {
    const support = cappedSupport(data.cycles.size);
    const strength = strengthFromSupport(support, totalCycles);
    if (strength === 'insufficient') continue;
    const minRel = Math.min(...data.rels);
    const maxRel = Math.max(...data.rels);
    const prePeriod = maxRel <= 0;
    const verb = appearsVerb(code);
    const title = prePeriod
      ? `${symptomLabel(code)} often ${verb} before your period`
      : `${symptomLabel(code)} often ${verb} around your period`;
    const timing =
      minRel === maxRel
        ? describeRel(minRel)
        : `${describeRel(minRel)} through ${describeRel(maxRel)}`;
    patterns.push({
      id: createId(),
      patternType: 'symptom_timing',
      targetCode: code,
      title,
      body: `You've recorded ${symptomLabel(code).toLowerCase()} around ${timing} in ${support} of your last ${totalCycles} cycles.\n\nThis does not necessarily mean your menstrual cycle caused the symptom.`,
      windowStart: minRel,
      windowEnd: maxRel,
      supportCount: support,
      totalCycles,
      strength,
      evidence: [...data.cycles].map(
        (c) => `Cycle starting ${c}: logged ${code}`,
      ),
      active: true,
    });
  }

  if (lowEnergyCycles.size >= 2) {
    const support = cappedSupport(lowEnergyCycles.size);
    const strength = strengthFromSupport(support, totalCycles);
    if (strength !== 'insufficient') {
      patterns.push({
        id: createId(),
        patternType: 'energy_timing',
        targetCode: 'low_energy',
        title: 'Lower energy was logged before your period',
        body: `You logged lower energy in the days before your period in ${support} of your last ${totalCycles} cycles. This describes your entries, not a cause or diagnosis.`,
        windowStart: -5,
        windowEnd: 0,
        supportCount: support,
        totalCycles,
        strength,
        evidence: [...lowEnergyCycles].map((c) => `Low energy near ${c}`),
        active: true,
      });
    }
  }

  if (lowMoodCycles.size >= 2) {
    const support = cappedSupport(lowMoodCycles.size);
    const strength = strengthFromSupport(support, totalCycles);
    if (strength !== 'insufficient') {
      patterns.push({
        id: createId(),
        patternType: 'mood_timing',
        targetCode: 'low_mood',
        title: 'Lower mood was logged before your period',
        body: `Lower mood was logged during the last few days before your period in ${support} of your last ${totalCycles} cycles.\n\nThis does not establish PMS or PMDD. Clinical assessment considers a prospective daily pattern across cycles, timing after symptoms start, and impact on daily life. If these changes significantly affect daily life, discuss them with a healthcare professional.`,
        windowStart: -4,
        windowEnd: 0,
        supportCount: support,
        totalCycles,
        strength,
        evidence: [...lowMoodCycles].map((c) => `Lower mood near ${c}`),
        active: true,
      });
    }
  }

  if (crampCycles.size >= 2) {
    const support = cappedSupport(crampCycles.size);
    const strength = strengthFromSupport(support, totalCycles);
    if (strength !== 'insufficient') {
      const allRels = [...crampCycles.values()].flat();
      const minRel = Math.min(...allRels);
      const maxRel = Math.max(...allRels);
      patterns.push({
        id: createId(),
        patternType: 'pain_timing',
        targetCode: 'cramps',
        title: 'Cramps were logged around bleeding',
        body: `You logged cramps ${describeRel(minRel)} through ${describeRel(maxRel)} in ${support} of your last ${totalCycles} cycles. This describes your entries, not a cause or diagnosis.`,
        windowStart: minRel,
        windowEnd: maxRel,
        supportCount: support,
        totalCycles,
        strength,
        evidence: [...crampCycles.keys()].map((c) => `Cramps near ${c}`),
        active: true,
      });
    }
  }

  return patterns.sort((a, b) => b.supportCount - a.supportCount);
}

function describeRel(rel: number): string {
  if (rel === 0) return 'the day your period starts';
  if (rel > 0) return `Day ${rel} of bleeding`;
  return `${Math.abs(rel)} day${Math.abs(rel) === 1 ? '' : 's'} before your period`;
}

export function patternMeta(pattern: PersonalPattern): string {
  return `Observed pattern · ${pattern.supportCount} of ${pattern.totalCycles} cycles`;
}

/**
 * Patterns whose period-relative window overlaps the next few days, using
 * the predicted window as the reference. Empty when predictions are hidden
 * or still learning.
 */
export function upcomingFromPatterns(
  patterns: PersonalPattern[],
  prediction: PeriodPrediction | null | undefined,
  horizon = 4,
): PersonalPattern[] {
  if (!prediction || prediction.confidenceBand === 'learning') return [];
  if (prediction.daysUntilLower === undefined) return [];
  const start = prediction.daysUntilLower;
  const rels: number[] = [];
  for (let offset = 0; offset < horizon; offset++) {
    rels.push(-(start - offset));
  }
  return patterns
    .filter((pattern) => {
      if (pattern.windowStart === undefined || pattern.windowEnd === undefined) {
        return false;
      }
      return rels.some(
        (rel) => rel >= pattern.windowStart! && rel <= pattern.windowEnd!,
      );
    })
    .slice(0, 3);
}

export function moodScore(mood?: MoodLevel): number | undefined {
  if (!mood) return undefined;
  const map: Record<MoodLevel, number> = {
    great: 5,
    good: 4,
    okay: 3,
    low: 2,
    rough: 1,
  };
  return map[mood];
}

export function energyScore(energy?: EnergyLevel): number | undefined {
  if (!energy) return undefined;
  const map: Record<EnergyLevel, number> = {
    very_high: 5,
    high: 4,
    normal: 3,
    low: 2,
    very_low: 1,
  };
  return map[energy];
}

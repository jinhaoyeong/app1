import type {
  DailyLog,
  PeriodEpisode,
  PeriodPrediction,
  PersonalPattern,
  TodayInsight,
  TrackingGoal,
  ChangeInsight,
} from '@/types';
import {
  cycleDayForDate,
  isCycleEligibleBleeding,
  neutralCycleTimingLabel,
} from './cycle';
import { dataCoverageLabel, formatPredictionWindow } from './prediction';
import { patternMeta } from './patterns';
import { toLocalDateString } from '@/utils/dates';

export function buildTodayInsight(options: {
  episodes: PeriodEpisode[];
  logs: Record<string, DailyLog>;
  prediction: PeriodPrediction | null;
  patterns: PersonalPattern[];
  changes: ChangeInsight[];
  goals: TrackingGoal[];
  completedCycles?: number;
  asOf?: string;
}): TodayInsight {
  const asOf = options.asOf ?? toLocalDateString();
  const { prediction, patterns, changes, goals, episodes } = options;

  // Priority: change > period soon > strong pattern > learning
  if (changes.length) {
    const c = changes[0];
    return {
      type: 'change',
      title: c.title,
      body: `${c.body.split('\n\n')[0]} This is different from your recent pattern. It is not a diagnosis.`,
      meta: 'Worth keeping an eye on',
      actionLabel: 'View details',
      actionHref: '/insights',
      safetyLevel: c.safetyLevel,
    };
  }

  if (
    prediction &&
    prediction.confidenceBand !== 'learning' &&
    prediction.daysUntilUpper !== undefined &&
    prediction.daysUntilUpper <= 5 &&
    prediction.daysUntilLower !== undefined &&
    prediction.daysUntilLower >= -1
  ) {
    const prepare = goals.includes('prepare_period');
    return {
      type: 'preparation',
      title: 'Your period may be approaching',
      body: `Your buffered next-period window is approximately ${formatPredictionWindow(prediction)} away. It may shift if this cycle differs from your recent ones.`,
      meta: dataCoverageLabel(options.completedCycles ?? 0),
      actionLabel: prepare ? 'Prepare' : 'Review',
      actionHref: '/preparation',
      safetyLevel: 0,
      confidence: prediction.confidenceBand,
    };
  }

  const relevant = patterns.find((p) => {
    if (p.windowStart === undefined || p.windowEnd === undefined) return false;
    // Use relative approximation via pattern window near period
    if (
      prediction?.daysUntilLower !== undefined &&
      prediction.daysUntilLower <= Math.abs(p.windowStart) + 1 &&
      prediction.daysUntilUpper !== undefined &&
      prediction.daysUntilUpper >= 0
    ) {
      return p.windowEnd <= 2;
    }
    return false;
  });

  if (relevant) {
    return {
      type: 'personal_pattern',
      title: 'A note from your history',
      body: relevant.title + '.',
      meta: patternMeta(relevant),
      actionLabel: 'View pattern',
      actionHref: '/insights',
      safetyLevel: 1,
      confidence: relevant.strength,
      relatedPatternId: relevant.id,
    };
  }

  if (patterns[0]) {
    return {
      type: 'personal_pattern',
      title: 'A pattern from your history',
      body: patterns[0].title + '.',
      meta: patternMeta(patterns[0]),
      actionLabel: 'Explore insights',
      actionHref: '/insights',
      safetyLevel: 1,
      confidence: patterns[0].strength,
      relatedPatternId: patterns[0].id,
    };
  }

  const day = cycleDayForDate(asOf, episodes);
  if (day) {
    return {
      type: 'learning',
      title: 'Start building your pattern',
      body: `A few seconds of logging each day helps Luma understand your recorded pattern. ${neutralCycleTimingLabel({ cycleDay: day, bleedingRecorded: isCycleEligibleBleeding(options.logs[asOf]) })}.`,
      meta: prediction
        ? dataCoverageLabel(options.completedCycles ?? 0)
        : undefined,
      actionLabel: 'Log today',
      actionHref: '/log',
      safetyLevel: 0,
    };
  }

  return {
    type: 'learning',
    title: "We're learning your cycle",
    body: 'We need more information before making reliable personal predictions. Log your period when it starts.',
    actionLabel: 'Log today',
    actionHref: '/log',
    safetyLevel: 0,
  };
}

export function forTodayRecommendations(log?: DailyLog): string[] {
  const tips: string[] = [];
  if (!log) return tips;
  if (log.energy === 'very_low' || log.energy === 'low') {
    tips.push(
      'Take additional rest if needed',
      'Keep exercise lighter if you feel uncomfortable',
      'Prioritise sleep tonight',
      'Stay hydrated',
    );
  }
  if (log.pain === 'moderate' || log.pain === 'severe') {
    tips.push(
      'Heat can help some people',
      'Gentle movement or rest, whichever feels better',
      'If pain is severe, worsening, or disrupting daily life, contact a clinician',
    );
  }
  if (log.symptoms?.includes('bloating')) {
    tips.push('Lighter meals and hydration may feel more comfortable');
  }
  return [...new Set(tips)].slice(0, 2);
}

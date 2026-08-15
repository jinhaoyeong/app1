import type {
  ConfidenceBand,
  ContraceptionType,
  CycleRegularity,
  PeriodEpisode,
  PeriodPrediction,
} from '@/types';
import { ALGORITHM_VERSION } from '@/data/catalog';
import { MENSTRUAL_REFERENCE } from '@/health/menstrualHealth';
import {
  addLocalDays,
  clamp,
  daysBetween,
  mean,
  median,
  stdDev,
  toLocalDateString,
  weightedMean,
} from '@/utils/dates';
import { completedCycleLengths, currentCycleStart } from './cycle';

function recencyWeights(n: number): number[] {
  // most recent = 1.0, then 0.9 ... down to max(0.5, ...)
  const weights: number[] = [];
  for (let i = 0; i < n; i++) {
    const fromEnd = n - 1 - i;
    weights.push(clamp(1 - fromEnd * 0.1, 0.5, 1));
  }
  return weights;
}

function bandFromScore(score: number, cycleCount: number): ConfidenceBand {
  if (cycleCount < 2) return 'learning';
  if (score >= 0.75) return 'high';
  if (score >= 0.45) return 'moderate';
  return 'lower';
}

export function predictPeriod(options: {
  episodes: PeriodEpisode[];
  asOf?: string;
  knownCycleLength?: number;
  contraceptionType?: ContraceptionType;
  cycleRegularity?: CycleRegularity;
}): PeriodPrediction | null {
  const asOf = options.asOf ?? toLocalDateString();
  const lengths = completedCycleLengths(options.episodes);
  const start = currentCycleStart(asOf, options.episodes);

  if (!start) {
    return null;
  }

  const recent = lengths.slice(-6);
  let expected: number;
  let lowerLength: number;
  let upperLength: number;

  if (recent.length >= 3) {
    const weights = recencyWeights(recent.length);
    const wMean = weightedMean(recent, weights);
    const med = median(recent) ?? wMean;
    const sd = stdDev(recent) ?? 0;
    // The centre uses recent personal history, while the visible range must
    // still cover the actual recent spread. A standard-deviation-only band can
    // look more precise than the person's own logged cycles justify.
    expected = sd > 4 ? med : (wMean + med) / 2;
    lowerLength = Math.min(...recent) - 1;
    upperLength = Math.max(...recent) + 1;
  } else if (recent.length === 2) {
    expected = mean(recent) ?? recent[1];
    lowerLength = Math.min(...recent) - 2;
    upperLength = Math.max(...recent) + 2;
  } else if (recent.length === 1) {
    expected = recent[0];
    lowerLength = recent[0] - 4;
    upperLength = recent[0] + 4;
  } else if (options.knownCycleLength) {
    expected = options.knownCycleLength;
    lowerLength = expected - 6;
    upperLength = expected + 6;
  } else {
    expected = 28;
    // This is only a learning scaffold and is not presented as a personal
    // estimate. The broad span avoids turning the population average into a
    // promise about an individual cycle.
    lowerLength = MENSTRUAL_REFERENCE.adultCycleDays.min;
    upperLength = MENSTRUAL_REFERENCE.adultCycleDays.max;
  }

  // Hormonal contraception can alter bleeding predictability
  const hormonal = [
    'combined_pill',
    'pop',
    'hormonal_iud',
    'implant',
    'injection',
    'patch',
    'ring',
  ].includes(options.contraceptionType ?? '');
  const irregular =
    options.cycleRegularity !== undefined &&
    options.cycleRegularity !== 'usually';
  if (hormonal || irregular) {
    lowerLength -= 2;
    upperLength += 2;
  }

  lowerLength = clamp(Math.round(lowerLength), 14, 90);
  upperLength = clamp(Math.round(upperLength), lowerLength + 1, 90);

  const predictedStart = addLocalDays(start, Math.round(expected));
  const lowerBound = addLocalDays(start, lowerLength);
  const upperBound = addLocalDays(start, upperLength);

  const dataScore = clamp(recent.length / 6, 0, 1);
  const halfSpread = Math.max(1, (upperLength - lowerLength) / 2);
  const stabilityScore = clamp(1 - halfSpread / 12, 0, 1);
  let confidence = clamp(0.25 + dataScore * 0.45 + stabilityScore * 0.3, 0, 1);
  if (hormonal || irregular) confidence = Math.min(confidence, 0.44);
  const confidenceBand = bandFromScore(confidence, recent.length);

  const daysUntilLower = daysBetween(asOf, lowerBound);
  const daysUntilUpper = daysBetween(asOf, upperBound);

  let explanation: string;
  if (recent.length >= 3) {
    explanation = `Your last ${recent.length} completed cycles ranged from ${Math.min(...recent)} to ${Math.max(...recent)} days. Luma adds a buffer because the next cycle can differ.`;
    if (irregular) {
      explanation +=
        ' You described your cycles as variable, so this estimate stays lower confidence.';
    }
  } else if (recent.length === 2) {
    explanation = `Your recent cycles ranged from ${Math.min(...recent)} to ${Math.max(...recent)} days.`;
  } else if (recent.length >= 1) {
    explanation = `Based on limited cycle history so far, this estimate may change.`;
  } else {
    explanation = `We're learning your cycle. Predictions become more personal after a few cycles.`;
  }

  return {
    predictedStart,
    lowerBound,
    upperBound,
    confidence,
    confidenceBand,
    algorithmVersion: ALGORITHM_VERSION,
    explanation,
    daysUntilLower,
    daysUntilUpper,
  };
}

export function formatPredictionWindow(prediction: PeriodPrediction): string {
  if (
    prediction.daysUntilLower !== undefined &&
    prediction.daysUntilUpper !== undefined &&
    prediction.daysUntilUpper >= 0
  ) {
    const lo = Math.max(0, prediction.daysUntilLower);
    const hi = Math.max(lo, prediction.daysUntilUpper);
    if (lo === hi) return `${lo} day${lo === 1 ? '' : 's'}`;
    return `${lo}-${hi} days`;
  }
  return `${prediction.lowerBound} - ${prediction.upperBound}`;
}

export function dataCoverageLabel(completedCycles: number): string {
  if (completedCycles <= 0) return 'No completed cycles yet';
  if (completedCycles === 1) {
    return 'Based on 1 completed cycle · estimate may change';
  }
  return `Based on ${completedCycles} completed cycles`;
}

export function baselineFromCycles(episodes: PeriodEpisode[]): {
  cycleCount: number;
  averageCycleLength?: number;
  medianCycleLength?: number;
  cycleLengthRange?: [number, number];
  cycleVariation?: number;
  ready: boolean;
  message: string;
} {
  const lengths = completedCycleLengths(episodes);
  const cycleCount = lengths.length;

  if (cycleCount === 0) {
    return {
      cycleCount: 0,
      ready: false,
      message: "We're learning your cycle.",
    };
  }
  if (cycleCount === 1) {
    return {
      cycleCount: 1,
      averageCycleLength: lengths[0],
      medianCycleLength: lengths[0],
      ready: false,
      message: "We're starting to understand your baseline.",
    };
  }

  const avg = mean(lengths)!;
  const med = median(lengths)!;
  const range: [number, number] = [Math.min(...lengths), Math.max(...lengths)];
  const variation = stdDev(lengths) ?? 0;
  const ready = cycleCount >= 3;

  let message: string;
  if (cycleCount === 2) {
    message = 'A pattern may be forming.';
  } else if (cycleCount < 6) {
    message = 'Your first cycle pattern is becoming clearer.';
  } else {
    message =
      variation <= 2
        ? 'Your cycle length appears relatively consistent.'
        : 'Your cycles vary, so predictions use a wider window.';
  }

  return {
    cycleCount,
    averageCycleLength: Math.round(avg * 10) / 10,
    medianCycleLength: med,
    cycleLengthRange: range,
    cycleVariation: Math.round(variation * 10) / 10,
    ready,
    message,
  };
}

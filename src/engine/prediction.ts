import type {
  ConfidenceBand,
  ContraceptionType,
  PeriodEpisode,
  PeriodPrediction,
} from '@/types';
import { ALGORITHM_VERSION } from '@/data/catalog';
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
}): PeriodPrediction | null {
  const asOf = options.asOf ?? toLocalDateString();
  const lengths = completedCycleLengths(options.episodes);
  const start = currentCycleStart(asOf, options.episodes);

  if (!start) {
    return null;
  }

  const recent = lengths.slice(-6);
  let expected: number;
  let variation = 3;

  if (recent.length >= 2) {
    const weights = recencyWeights(recent.length);
    const wMean = weightedMean(recent, weights);
    const med = median(recent) ?? wMean;
    // Prefer median when outliers present
    const sd = stdDev(recent) ?? 0;
    expected = sd > 4 ? med : (wMean + med) / 2;
    variation = Math.max(1, Math.round(sd || 2));
  } else if (recent.length === 1) {
    expected = recent[0];
    variation = 3;
  } else if (options.knownCycleLength) {
    expected = options.knownCycleLength;
    variation = 4;
  } else {
    expected = 28;
    variation = 5;
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
  if (hormonal) variation += 1;

  const predictedStart = addLocalDays(start, Math.round(expected));
  const windowPad = clamp(variation + (recent.length < 3 ? 2 : 0), 1, 10);
  const lowerBound = addLocalDays(predictedStart, -windowPad);
  const upperBound = addLocalDays(predictedStart, windowPad);

  const dataScore = clamp(recent.length / 6, 0, 1);
  const stabilityScore = clamp(1 - variation / 10, 0, 1);
  const confidence = clamp(0.25 + dataScore * 0.45 + stabilityScore * 0.3, 0, 1);
  const confidenceBand = bandFromScore(confidence, recent.length);

  const daysUntilLower = daysBetween(asOf, lowerBound);
  const daysUntilUpper = daysBetween(asOf, upperBound);

  let explanation: string;
  if (recent.length >= 6 && variation <= 2) {
    explanation = `Your previous ${recent.length} cycles were between ${Math.min(...recent)}–${Math.max(...recent)} days.`;
  } else if (recent.length >= 3) {
    explanation = `Your recent cycles have varied by approximately ${variation} days.`;
  } else if (recent.length >= 1) {
    explanation = `Based on limited cycle history so far — this estimate may change.`;
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
    return `${lo}–${hi} days`;
  }
  return `${prediction.lowerBound} – ${prediction.upperBound}`;
}

export function confidenceLabel(band: ConfidenceBand): string {
  switch (band) {
    case 'high':
      return 'High confidence';
    case 'moderate':
      return 'Moderate confidence';
    case 'lower':
      return 'Lower confidence';
    default:
      return 'Learning your cycle';
  }
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
        : 'Your cycles vary — predictions use a wider window.';
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

import { useMemo } from 'react';
import { useLumaStore } from '@/store/lumaStore';
import {
  cycleDayForDate,
  estimatePhase,
  phaseLabel,
  currentCycleStart,
  completedCycleLengths,
  isCycleEligibleBleeding,
  neutralCycleTimingLabel,
} from '@/engine/cycle';
import {
  predictPeriod,
  baselineFromCycles,
  formatPredictionWindow,
  dataCoverageLabel,
} from '@/engine/prediction';
import { detectPatterns, upcomingFromPatterns } from '@/engine/patterns';
import { detectChanges } from '@/engine/changes';
import { detectConcerns } from '@/engine/concerns';
import { buildConceptionGuidance } from '@/engine/conception';
import { buildTodayInsight, forTodayRecommendations } from '@/engine/insights';
import { buildCycleComparison, buildHealthSummary } from '@/engine/summary';
import {
  buildCycleMap,
  detailedPhaseLabel,
  isPossibleFertileDate,
} from '@/engine/fertility';
import {
  fertilityEstimateSafety,
  fertilityEstimateVisible,
  periodPredictionSafety,
} from '@/engine/safety';
import { toLocalDateString } from '@/utils/dates';

export function useCycleIntelligence(asOf = toLocalDateString()) {
  const episodes = useLumaStore((s) => s.periodEpisodes);
  const logs = useLumaStore((s) => s.dailyLogs);
  const profile = useLumaStore((s) => s.profile);

  return useMemo(() => {
    const rawPrediction = predictPeriod({
      episodes,
      asOf,
      knownCycleLength: undefined,
      contraceptionType: profile.contraceptionType,
      cycleRegularity: profile.cycleRegularity,
    });
    const baseline = baselineFromCycles(episodes);
    const cycleLengths = completedCycleLengths(episodes);
    const predictionSafety = periodPredictionSafety(profile);
    const prediction = predictionSafety.canShow ? rawPrediction : null;
    const fertilitySafety = fertilityEstimateSafety(
      profile,
      baseline.cycleCount,
      cycleLengths,
    );
    const fertilityVisible = fertilityEstimateVisible(
      profile,
      baseline.cycleCount,
      cycleLengths,
    );
    const patterns = detectPatterns(episodes, logs);
    const changes = detectChanges({ episodes, logs, asOf });
    const cycleDay = cycleDayForDate(asOf, episodes);
    const cycleStart = currentCycleStart(asOf, episodes);
    const cycleMap = buildCycleMap({
      cycleStart,
      cycleLength:
        baseline.medianCycleLength ?? baseline.averageCycleLength ?? 28,
      periodLength: profile.usualPeriodLength,
      prediction,
      asOf,
    });
    const bleedingRecorded = isCycleEligibleBleeding(logs[asOf]);
    const fertileOverlap = Boolean(
      fertilityVisible &&
      bleedingRecorded &&
      cycleMap &&
      isPossibleFertileDate(cycleMap, asOf),
    );
    const detailedPhase = fertilityVisible
      ? bleedingRecorded
        ? ('period' as const)
        : cycleMap?.phaseForDate(asOf)
      : undefined;
    const phase = fertilityVisible
      ? bleedingRecorded
        ? ('menstrual' as const)
        : estimatePhase(
            cycleDay,
            cycleMap?.cycleLength ?? baseline.averageCycleLength,
            profile.usualPeriodLength ?? cycleMap?.periodLength,
          )
      : bleedingRecorded
        ? ('menstrual' as const)
        : ('unknown' as const);
    const todayInsight = buildTodayInsight({
      episodes,
      logs,
      prediction,
      patterns,
      changes,
      goals: profile.trackingGoals,
      completedCycles: baseline.cycleCount,
      asOf,
    });
    const upcoming = upcomingFromPatterns(patterns, prediction);
    // Conception guidance reads the safety gate rather than replacing it: the
    // declared goal unlocks education, the cycle history unlocks dates.
    const conception = buildConceptionGuidance({
      profile,
      cycleMap,
      fertilitySafety,
      fertilityVisible,
    });
    const concerns = detectConcerns({ profile, episodes, logs });
    const todayLog = logs[asOf];
    const recommendations = forTodayRecommendations(todayLog);
    const comparison = buildCycleComparison(episodes, logs);

    return {
      asOf,
      episodes,
      logs,
      prediction,
      baseline,
      patterns,
      changes,
      concerns,
      conception,
      cycleDay,
      cycleStart,
      phase,
      detailedPhase,
      cycleMap,
      fertilitySafety,
      fertilityVisible,
      fertileOverlap,
      predictionSafety,
      phaseLabel: fertileOverlap
        ? 'Period bleeding recorded · calendar fertile overlap is possible'
        : detailedPhase
          ? detailedPhaseLabel(detailedPhase)
          : fertilityVisible
            ? phaseLabel(phase)
            : neutralCycleTimingLabel({ cycleDay, bleedingRecorded }),
      todayInsight,
      upcoming,
      todayLog,
      recommendations,
      comparison,
      predictionWindow: prediction
        ? formatPredictionWindow(prediction)
        : undefined,
      dataCoverageText: prediction
        ? dataCoverageLabel(baseline.cycleCount)
        : undefined,
      buildSummary: (months: 3 | 6 | 12) =>
        buildHealthSummary({ episodes, logs, months }),
    };
  }, [episodes, logs, profile, asOf]);
}

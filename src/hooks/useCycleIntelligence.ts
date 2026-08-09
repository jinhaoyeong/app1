import { useMemo } from 'react';
import { useLumaStore } from '@/store/lumaStore';
import {
  cycleDayForDate,
  estimatePhase,
  phaseLabel,
  currentCycleStart,
} from '@/engine/cycle';
import {
  predictPeriod,
  baselineFromCycles,
  formatPredictionWindow,
  dataCoverageLabel,
} from '@/engine/prediction';
import { detectPatterns } from '@/engine/patterns';
import { detectChanges } from '@/engine/changes';
import { buildTodayInsight, forTodayRecommendations } from '@/engine/insights';
import { buildCycleComparison, buildHealthSummary } from '@/engine/summary';
import { buildCycleMap, detailedPhaseLabel } from '@/engine/fertility';
import {
  fertilityEstimateSafety,
  fertilityEstimateVisible,
} from '@/engine/safety';
import { toLocalDateString } from '@/utils/dates';

export function useCycleIntelligence(asOf = toLocalDateString()) {
  const episodes = useLumaStore((s) => s.periodEpisodes);
  const logs = useLumaStore((s) => s.dailyLogs);
  const profile = useLumaStore((s) => s.profile);

  return useMemo(() => {
    const prediction = predictPeriod({
      episodes,
      asOf,
      knownCycleLength: undefined,
      contraceptionType: profile.contraceptionType,
    });
    const baseline = baselineFromCycles(episodes);
    const fertilitySafety = fertilityEstimateSafety(
      profile,
      baseline.cycleCount,
    );
    const fertilityVisible = fertilityEstimateVisible(
      profile,
      baseline.cycleCount,
    );
    const patterns = detectPatterns(episodes, logs);
    const changes = detectChanges({ episodes, logs, asOf });
    const cycleDay = cycleDayForDate(asOf, episodes);
    const cycleStart = currentCycleStart(asOf, episodes);
    const cycleMap = buildCycleMap({
      cycleStart,
      cycleLength: baseline.averageCycleLength ?? 28,
      periodLength: profile.usualPeriodLength ?? 5,
      prediction,
      asOf,
    });
    const detailedPhase = fertilityVisible
      ? cycleMap?.phaseForDate(asOf)
      : undefined;
    const phase = estimatePhase(
      cycleDay,
      cycleMap?.cycleLength ?? baseline.averageCycleLength,
      profile.usualPeriodLength ?? 5,
    );
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
      cycleDay,
      cycleStart,
      phase,
      detailedPhase,
      cycleMap,
      fertilitySafety,
      fertilityVisible,
      phaseLabel: detailedPhase
        ? detailedPhaseLabel(detailedPhase)
        : phaseLabel(phase),
      todayInsight,
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

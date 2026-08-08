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
  confidenceLabel,
} from '@/engine/prediction';
import { detectPatterns } from '@/engine/patterns';
import { detectChanges } from '@/engine/changes';
import { buildTodayInsight, forTodayRecommendations } from '@/engine/insights';
import { buildCycleComparison, buildHealthSummary } from '@/engine/summary';
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
    const patterns = detectPatterns(episodes, logs);
    const changes = detectChanges({ episodes, logs, asOf });
    const cycleDay = cycleDayForDate(asOf, episodes);
    const cycleStart = currentCycleStart(asOf, episodes);
    const phase = estimatePhase(
      cycleDay,
      baseline.averageCycleLength,
      profile.usualPeriodLength ?? 5,
    );
    const todayInsight = buildTodayInsight({
      episodes,
      logs,
      prediction,
      patterns,
      changes,
      goals: profile.trackingGoals,
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
      phaseLabel: phaseLabel(phase),
      todayInsight,
      todayLog,
      recommendations,
      comparison,
      predictionWindow: prediction
        ? formatPredictionWindow(prediction)
        : undefined,
      confidenceText: prediction
        ? confidenceLabel(prediction.confidenceBand)
        : undefined,
      buildSummary: (months: 3 | 6 | 12) =>
        buildHealthSummary({ episodes, logs, months }),
    };
  }, [episodes, logs, profile, asOf]);
}

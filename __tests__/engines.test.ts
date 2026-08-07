import {
  completedCycleLengths,
  cycleDayForDate,
  estimatePhase,
  inferPeriodEpisodes,
  relativeToPeriod,
} from '../src/engine/cycle';
import { predictPeriod, baselineFromCycles } from '../src/engine/prediction';
import { detectPatterns } from '../src/engine/patterns';
import { detectChanges } from '../src/engine/changes';
import type { DailyLog, PeriodEpisode } from '../src/types';

function ep(start: string, end?: string): PeriodEpisode {
  return {
    id: start,
    startDate: start,
    endDate: end,
    source: 'manual',
    manuallyConfirmed: true,
  };
}

describe('cycle engine', () => {
  test('cycle day from period start', () => {
    const episodes = [ep('2026-07-01')];
    expect(cycleDayForDate('2026-07-01', episodes)).toBe(1);
    expect(cycleDayForDate('2026-07-10', episodes)).toBe(10);
  });

  test('completed cycle lengths ignore outliers outside 14–90', () => {
    const episodes = [
      ep('2026-01-01'),
      ep('2026-01-30'),
      ep('2026-02-28'),
      ep('2026-06-01'), // long gap still valid if <=90
    ];
    expect(completedCycleLengths(episodes)).toEqual([29, 29, 93].filter((n) => n <= 90));
    // 93 filtered → [29, 29]
    expect(completedCycleLengths(episodes)).toEqual([29, 29]);
  });

  test('infer episodes tolerates one-day gap', () => {
    const logs: Record<string, DailyLog> = {
      '2026-08-01': {
        id: '1',
        date: '2026-08-01',
        flow: 'medium',
        updatedAt: '',
      },
      '2026-08-02': {
        id: '2',
        date: '2026-08-02',
        flow: 'heavy',
        updatedAt: '',
      },
      '2026-08-03': {
        id: '3',
        date: '2026-08-03',
        flow: 'none',
        updatedAt: '',
      },
      '2026-08-04': {
        id: '4',
        date: '2026-08-04',
        flow: 'light',
        updatedAt: '',
      },
    };
    const episodes = inferPeriodEpisodes([], logs);
    expect(episodes).toHaveLength(1);
    expect(episodes[0].startDate).toBe('2026-08-01');
    expect(episodes[0].endDate).toBe('2026-08-04');
  });

  test('spotting alone does not create period', () => {
    const logs: Record<string, DailyLog> = {
      '2026-08-01': {
        id: '1',
        date: '2026-08-01',
        flow: 'spotting',
        updatedAt: '',
      },
    };
    expect(inferPeriodEpisodes([], logs)).toHaveLength(0);
  });

  test('phase estimation', () => {
    expect(estimatePhase(2, 30, 5)).toBe('menstrual');
    expect(estimatePhase(10, 30, 5)).toBe('follicular');
    expect(estimatePhase(16, 30, 5)).toBe('ovulation');
    expect(estimatePhase(24, 30, 5)).toBe('luteal');
  });

  test('relative to period', () => {
    const episodes = [ep('2026-08-10')];
    expect(relativeToPeriod('2026-08-07', episodes)).toBe(-3);
    expect(relativeToPeriod('2026-08-10', episodes)).toBe(1);
    expect(relativeToPeriod('2026-08-12', episodes)).toBe(3);
  });
});

describe('prediction engine', () => {
  test('returns range with confidence — never a single certainty claim', () => {
    const episodes = [
      ep('2026-01-01', '2026-01-05'),
      ep('2026-01-30', '2026-02-03'),
      ep('2026-03-01', '2026-03-05'),
      ep('2026-03-30', '2026-04-03'),
      ep('2026-04-29', '2026-05-03'),
      ep('2026-05-28', '2026-06-01'),
      ep('2026-06-27', '2026-07-01'),
    ];
    const prediction = predictPeriod({
      episodes,
      asOf: '2026-07-20',
    });
    expect(prediction).not.toBeNull();
    expect(prediction!.lowerBound < prediction!.upperBound || prediction!.lowerBound === prediction!.predictedStart).toBe(true);
    expect(prediction!.lowerBound <= prediction!.predictedStart).toBe(true);
    expect(prediction!.upperBound >= prediction!.predictedStart).toBe(true);
    expect(['high', 'moderate', 'lower', 'learning']).toContain(
      prediction!.confidenceBand,
    );
    expect(prediction!.algorithmVersion).toBe('period_prediction_v1');
  });

  test('learning state with sparse data', () => {
    const episodes = [ep('2026-07-01')];
    const prediction = predictPeriod({ episodes, asOf: '2026-07-10' });
    expect(prediction?.confidenceBand).toBe('learning');
  });

  test('baseline readiness after 3 cycles', () => {
    const episodes = [
      ep('2026-01-01'),
      ep('2026-01-30'),
      ep('2026-02-28'),
      ep('2026-03-30'),
    ];
    const baseline = baselineFromCycles(episodes);
    expect(baseline.cycleCount).toBe(3);
    expect(baseline.ready).toBe(true);
    expect(baseline.averageCycleLength).toBeGreaterThan(20);
  });
});

describe('pattern engine', () => {
  test('does not invent patterns from a single occurrence', () => {
    const episodes = [ep('2026-06-01'), ep('2026-07-01'), ep('2026-07-31')];
    const logs: Record<string, DailyLog> = {
      '2026-06-28': {
        id: '1',
        date: '2026-06-28',
        symptoms: ['bloating'],
        updatedAt: '',
      },
    };
    expect(detectPatterns(episodes, logs)).toHaveLength(0);
  });

  test('detects repeating pre-period bloating', () => {
    const episodes = [
      ep('2026-03-01'),
      ep('2026-03-31'),
      ep('2026-04-30'),
      ep('2026-05-30'),
      ep('2026-06-29'),
      ep('2026-07-29'),
    ];
    const logs: Record<string, DailyLog> = {};
    for (const start of episodes.map((e) => e.startDate).slice(1)) {
      // 3 days before each period after the first
      const [y, m, d] = start.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      dt.setDate(dt.getDate() - 3);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      logs[key] = {
        id: key,
        date: key,
        symptoms: ['bloating'],
        energy: 'low',
        mood: 'low',
        updatedAt: '',
      };
    }
    const patterns = detectPatterns(episodes, logs);
    expect(patterns.some((p) => p.targetCode === 'bloating')).toBe(true);
    const bloating = patterns.find((p) => p.targetCode === 'bloating')!;
    expect(['possible', 'repeating', 'strong']).toContain(bloating.strength);
    expect(bloating.body.toLowerCase()).toContain('not necessarily');
  });
});

describe('change detection', () => {
  test('flags unusually long current cycle without diagnosing', () => {
    const episodes = [
      ep('2026-01-01'),
      ep('2026-01-30'),
      ep('2026-03-01'),
      ep('2026-03-30'),
      ep('2026-04-29'),
      ep('2026-05-28'),
      ep('2026-06-27'), // current start; asOf makes it long
    ];
    const changes = detectChanges({
      episodes,
      logs: {},
      asOf: '2026-08-10', // ~44 days
    });
    expect(changes.some((c) => c.kind === 'cycle_long')).toBe(true);
    expect(changes[0].body.toLowerCase()).not.toContain('pcos');
    expect(changes[0].body.toLowerCase()).toContain('healthcare');
  });
});

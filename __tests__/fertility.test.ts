import { addLocalDays } from '@/utils/dates';
import { buildCycleMap } from '@/engine/fertility';

describe('cycle map estimates', () => {
  it('derives the ovulation day, fertile window, and day after from the next period', () => {
    const map = buildCycleMap({
      cycleStart: '2026-08-01',
      cycleLength: 28,
      periodLength: 5,
      asOf: '2026-08-12',
      prediction: {
        predictedStart: '2026-08-29',
        lowerBound: '2026-08-27',
        upperBound: '2026-08-31',
        confidence: 0.72,
        confidenceBand: 'moderate',
        algorithmVersion: 'test',
        explanation: 'test',
      },
    });

    expect(map?.ovulationDate).toBe('2026-08-15');
    expect(map?.dayAfterOvulationDate).toBe('2026-08-16');
    expect(map?.fertileWindowStart).toBe('2026-08-10');
    expect(map?.fertileWindowEnd).toBe('2026-08-16');
    expect(map?.ovulationWindowStart).toBe('2026-08-13');
    expect(map?.ovulationWindowEnd).toBe('2026-08-17');
    expect(map?.phaseForDate('2026-08-14')).toBe('fertile');
    expect(map?.phaseForDate('2026-08-15')).toBe('ovulation');
    expect(map?.phaseForDate('2026-08-16')).toBe('day_after_ovulation');
  });

  it('keeps an unusually short cycle inside safe phase bounds', () => {
    const map = buildCycleMap({
      cycleStart: '2026-08-01',
      cycleLength: 18,
      periodLength: 7,
      prediction: {
        predictedStart: addLocalDays('2026-08-01', 18),
        lowerBound: addLocalDays('2026-08-01', 17),
        upperBound: addLocalDays('2026-08-01', 19),
        confidence: 0.35,
        confidenceBand: 'lower',
        algorithmVersion: 'test',
        explanation: 'test',
      },
    });

    expect(map?.ovulationCycleDay).toBe(9);
    expect(map?.phaseForDate('2026-08-07')).toBe('period');
    expect(map?.phaseForDate('2026-08-09')).toBe('ovulation');
  });
});

import { addLocalDays } from '@/utils/dates';
import { buildCycleMap, isPossibleFertileDate } from '@/engine/fertility';

describe('cycle map estimates', () => {
  it('keeps fertile timing as broad ranges instead of an exact ovulation day', () => {
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

    expect(map?.fertileWindowStart).toBe('2026-08-06');
    expect(map?.fertileWindowEnd).toBe('2026-08-22');
    expect(map?.ovulationWindowStart).toBe('2026-08-11');
    expect(map?.ovulationWindowEnd).toBe('2026-08-21');
    expect(map?.postOvulationWindowStart).toBe('2026-08-22');
    expect(map?.postOvulationWindowEnd).toBe('2026-08-24');
    expect(map?.hasPeriodEstimate).toBe(true);
    expect(map?.periodLengthKnown).toBe(true);
    expect(map?.phaseForDate('2026-08-10')).toBe('possible_fertile');
    expect(map?.phaseForDate('2026-08-15')).toBe('possible_ovulation');
    expect(map?.phaseForDate('2026-08-22')).toBe('possible_post_ovulation');
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

    expect(map?.fertileWindowCycleDayStart).toBe(1);
    expect(map?.ovulationWindowCycleDayStart).toBe(2);
    expect(map?.phaseForDate('2026-08-07')).toBe('period');
    expect(isPossibleFertileDate(map!, '2026-08-07')).toBe(true);
    expect(map?.phaseForDate('2026-08-09')).toBe('possible_ovulation');
  });

  it('does not invent a period end or next-period window when they are unknown', () => {
    const map = buildCycleMap({
      cycleStart: '2026-08-01',
      cycleLength: 28,
    });
    expect(map?.periodEnd).toBe('2026-08-01');
    expect(map?.periodLengthKnown).toBe(false);
    expect(map?.hasPeriodEstimate).toBe(false);
  });
});

import {
  buildCycleDialModel,
  cycleDayFromRelative,
  logHasRecord,
  relativeFromCycleDay,
  summarizeLog,
} from '../src/engine/dial';
import {
  progressToDay,
  shortestTarget,
  snapProgress,
  touchToProgress,
  wrapCycleDay,
  wrapUnit,
  wrappedAround,
} from '../src/engine/dialMotion';
import { detectPatterns } from '../src/engine/patterns';
import type { DailyLog, PeriodEpisode } from '../src/types';

function ep(start: string): PeriodEpisode {
  return {
    id: start,
    startDate: start,
    source: 'manual',
    manuallyConfirmed: true,
  };
}

function log(
  date: string,
  patch: Partial<Omit<DailyLog, 'id' | 'date' | 'updatedAt'>>,
): DailyLog {
  return { id: date, date, updatedAt: '', ...patch };
}

describe('dial relative mapping', () => {
  test('period days stay numbered from the recorded start', () => {
    expect(relativeFromCycleDay(1, 28)).toBe(1);
    expect(relativeFromCycleDay(5, 28)).toBe(5);
    expect(cycleDayFromRelative(1, 28)).toBe(1);
    expect(cycleDayFromRelative(5, 28)).toBe(5);
  });

  test('late-cycle days map onto the days before the next expected start', () => {
    expect(relativeFromCycleDay(28, 28)).toBe(-1);
    expect(relativeFromCycleDay(24, 28)).toBe(-5);
    expect(cycleDayFromRelative(-1, 28)).toBe(28);
    expect(cycleDayFromRelative(-5, 28)).toBe(24);
    expect(cycleDayFromRelative(0, 28)).toBe(1);
  });

  test('an overdue day is not treated as the pre-period window', () => {
    expect(relativeFromCycleDay(35, 28)).toBeUndefined();
  });
});

describe('dial records and patterns', () => {
  test('marks logged days in the current cycle only', () => {
    const model = buildCycleDialModel({
      cycleStart: '2026-08-10',
      cycleLength: 28,
      expectedLength: 28,
      asOf: '2026-08-20',
      episodes: [ep('2026-08-10')],
      patterns: [],
      logs: {
        '2026-08-10': log('2026-08-10', { flow: 'medium' }),
        '2026-08-12': log('2026-08-12', { mood: 'low' }),
        '2026-07-01': log('2026-07-01', { mood: 'rough' }),
      },
    });
    expect(model.loggedDays).toEqual([1, 3]);
  });

  test('reading a day surfaces that cycle’s log and matching patterns', () => {
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
      const before =
        start.slice(0, 8) + String(Number(start.slice(8)) - 3).padStart(2, '0');
      // Safer date math via known starts in this fixture.
      logs[before] = log(before, {
        symptoms: ['bloating'],
        energy: 'low',
        mood: 'low',
      });
    }
    // Current cycle start 2026-07-29, cycle day 26 = 2026-08-23, 3 days before an expected day 29 start...
    // July 29 + 25 days = Aug 23. Next period not yet recorded.
    logs['2026-08-23'] = log('2026-08-23', {
      symptoms: ['bloating'],
      mood: 'okay',
    });

    const patterns = detectPatterns(episodes, logs);
    expect(patterns.some((p) => p.targetCode === 'bloating')).toBe(true);

    const model = buildCycleDialModel({
      cycleStart: '2026-07-29',
      cycleLength: 28,
      expectedLength: 28,
      asOf: '2026-08-23',
      episodes,
      patterns,
      logs,
    });

    const reading = model.readingFor(26);
    expect(reading.date).toBe('2026-08-23');
    expect(reading.logSummary).toContain('bloating');
    expect(reading.logSummary).toContain('mood okay');
    expect(reading.patterns.some((p) => p.targetCode === 'bloating')).toBe(
      true,
    );
    expect(model.patternDays).toContain(26);
  });

  test('history counts the same cycle day across earlier cycles', () => {
    const episodes = [ep('2026-06-01'), ep('2026-07-01'), ep('2026-08-01')];
    const logs = {
      '2026-06-03': log('2026-06-03', { symptoms: ['cramps'], mood: 'low' }),
      '2026-07-03': log('2026-07-03', { symptoms: ['cramps'] }),
      '2026-08-03': log('2026-08-03', { mood: 'good' }),
    };
    const model = buildCycleDialModel({
      cycleStart: '2026-08-01',
      cycleLength: 28,
      expectedLength: 28,
      asOf: '2026-08-10',
      episodes,
      patterns: [],
      logs,
    });
    const reading = model.readingFor(3);
    const cramps = reading.history.find((h) => h.key === 'symptom:cramps');
    expect(cramps?.support).toBe(2);
    expect(cramps?.total).toBe(3);
    expect(reading.logSummary).toContain('mood good');
    expect(reading.patternNote.toLowerCase()).toContain('pattern');
  });

  test('future days keep pattern windows but never invent a log', () => {
    const model = buildCycleDialModel({
      cycleStart: '2026-08-10',
      cycleLength: 28,
      expectedLength: 28,
      asOf: '2026-08-12',
      episodes: [ep('2026-08-10')],
      patterns: [
        {
          id: 'p1',
          patternType: 'energy_timing',
          targetCode: 'low_energy',
          title: 'Lower energy was logged before your period',
          body: 'Entries only.',
          windowStart: -5,
          windowEnd: 0,
          supportCount: 3,
          totalCycles: 4,
          strength: 'repeating',
          evidence: [],
          active: true,
        },
      ],
      logs: {},
    });
    const future = model.readingFor(26);
    expect(future.isFuture).toBe(true);
    expect(future.log).toBeUndefined();
    expect(future.patterns[0]?.targetCode).toBe('low_energy');
    expect(model.patternDays).toEqual(
      expect.arrayContaining([1, 24, 25, 26, 27, 28]),
    );
  });

  test('summarizeLog lists recorded fields and ignores empty logs', () => {
    expect(logHasRecord(log('2026-08-01', {}))).toBe(false);
    expect(
      summarizeLog(
        log('2026-08-01', {
          flow: 'light',
          mood: 'good',
          symptoms: ['headache'],
        }),
      ),
    ).toBe('light flow · mood good · headache');
  });

  test('sleep, LH, and mucus count as recorded and appear in the readout', () => {
    const recorded = log('2026-08-01', {
      sleepHours: 8,
      lhTest: 'positive',
      mucus: 'egg_white',
    });
    expect(logHasRecord(recorded)).toBe(true);
    expect(summarizeLog(recorded)).toContain('8 hours sleep');
    expect(summarizeLog(recorded)).toContain('LH test positive');
    expect(summarizeLog(recorded)).toContain('egg white mucus');
  });
});

describe('dial motion wrapping', () => {
  test('progress wraps past a full turn instead of clamping at 360°', () => {
    expect(wrapUnit(0.95)).toBeCloseTo(0.95);
    expect(wrapUnit(1.05)).toBeCloseTo(0.05);
    expect(wrapUnit(-0.05)).toBeCloseTo(0.95);
    expect(progressToDay(0.99, 28)).toBe(28);
    expect(progressToDay(1.01, 28)).toBe(1);
    expect(progressToDay(-0.01, 28)).toBe(28);
  });

  test('a drag across twelve o’clock continues the current lap', () => {
    // 12 o’clock from just before the seam should become 1.0, not 0.
    expect(touchToProgress(100, 0, 100, 0.95)).toBeCloseTo(1);
    expect(touchToProgress(100, 0, 100, 0.05)).toBeCloseTo(0);
    // 11 o’clock from just after the seam goes onto the previous lap.
    const eleven = Math.PI * 2 * (11 / 12);
    const x = 100 + 80 * Math.sin(eleven);
    const y = 100 - 80 * Math.cos(eleven);
    expect(touchToProgress(x, y, 100, 0.05)).toBeCloseTo(-1 / 12, 5);
  });

  test('release snaps to a whole day without unwinding earlier laps', () => {
    expect(snapProgress(2.99, 28)).toBeCloseTo(2 + (28 - 0.5) / 28, 5);
    expect(snapProgress(3.01, 28)).toBeCloseTo(3 + 0.5 / 28, 5);
  });

  test('today jumps take the short way around', () => {
    expect(shortestTarget(0.95, 0.05)).toBeCloseTo(1.05);
    expect(shortestTarget(0.05, 0.95)).toBeCloseTo(-0.05);
  });

  test('cycle days wrap for accessibility steps', () => {
    expect(wrapCycleDay(29, 28)).toBe(1);
    expect(wrapCycleDay(0, 28)).toBe(28);
    expect(wrappedAround(28, 1, 28)).toBe(true);
    expect(wrappedAround(1, 28, 28)).toBe(true);
    expect(wrappedAround(10, 11, 28)).toBe(false);
  });
});

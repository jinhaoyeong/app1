import {
  CONDITION_NAMES_FORBIDDEN_IN_CONCERNS,
  contextAllowsInterpretation,
  detectConcerns,
} from '@/engine/concerns';
import type { DailyLog, PeriodEpisode, Profile } from '@/types';
import { addLocalDays } from '@/utils/dates';

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    timezone: 'UTC',
    locale: 'en',
    onboardingComplete: true,
    trackingGoals: ['understand_symptoms'],
    cycleRegularity: 'usually',
    contraceptionType: 'none',
    safetyContexts: ['none'],
    safetyContextReviewed: true,
    fertilityEnabled: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/** Build episodes from a list of cycle lengths, starting at `first`. */
function episodesFrom(lengths: number[], first = '2026-01-05'): PeriodEpisode[] {
  const episodes: PeriodEpisode[] = [];
  let start = first;
  episodes.push({
    id: 'e0',
    startDate: start,
    source: 'manual',
    manuallyConfirmed: true,
  });
  lengths.forEach((length, index) => {
    start = addLocalDays(start, length);
    episodes.push({
      id: `e${index + 1}`,
      startDate: start,
      source: 'manual',
      manuallyConfirmed: true,
    });
  });
  return episodes;
}

function log(date: string, patch: Partial<DailyLog>): DailyLog {
  return {
    id: date,
    date,
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...patch,
  };
}

/** Severe, activity-limiting pain on the first days of each recent cycle. */
function disruptivePainLogs(
  episodes: PeriodEpisode[],
  cycles: number,
  daysPerCycle: number,
): Record<string, DailyLog> {
  const logs: Record<string, DailyLog> = {};
  for (const episode of episodes.slice(-cycles)) {
    for (let day = 0; day < daysPerCycle; day += 1) {
      const date = addLocalDays(episode.startDate, day);
      logs[date] = log(date, {
        pain: 'severe',
        functionalImpact: 'significant',
      });
    }
  }
  return logs;
}

describe('concern engine gates on context before interpreting anything', () => {
  it('stays silent until cycle context has been reviewed', () => {
    expect(
      contextAllowsInterpretation(profile({ safetyContextReviewed: false })),
    ).toBe(false);
  });

  it('stays silent on hormonal contraception', () => {
    expect(
      contextAllowsInterpretation(profile({ contraceptionType: 'pop' })),
    ).toBe(false);
  });

  it.each([
    'postpartum',
    'perimenopause',
    'endometriosis_or_adenomyosis',
    'possible_pregnancy',
  ] as const)('stays silent for the %s context', (context) => {
    expect(
      contextAllowsInterpretation(profile({ safetyContexts: [context] })),
    ).toBe(false);
  });

  it('produces nothing when context blocks interpretation', () => {
    const episodes = episodesFrom([28, 28, 28, 28, 40, 41, 42]);
    expect(
      detectConcerns({
        profile: profile({ safetyContexts: ['postpartum'] }),
        episodes,
        logs: disruptivePainLogs(episodes, 4, 3),
      }),
    ).toEqual([]);
  });
});

describe('cycle-length concern reads a personal baseline, not a fixed number', () => {
  it('does not flag a stable long-cycle baseline', () => {
    // Every cycle is 35+ days, but this is simply how this person is.
    const episodes = episodesFrom([36, 35, 36, 35, 36, 35, 36]);
    const concerns = detectConcerns({ profile: profile(), episodes, logs: {} });
    expect(concerns.find((c) => c.kind === 'cycle_length_shift')).toBeUndefined();
  });

  it('flags a repeated departure from a settled baseline', () => {
    const episodes = episodesFrom([28, 27, 29, 28, 28, 27, 41, 42, 40]);
    const concerns = detectConcerns({ profile: profile(), episodes, logs: {} });
    const shift = concerns.find((c) => c.kind === 'cycle_length_shift');
    expect(shift).toBeDefined();
    expect(shift?.evidence).toMatch(/longer/);
    expect(shift?.actionHref).toBe('/health-summary');
  });

  it('does not flag a single outlier cycle', () => {
    const episodes = episodesFrom([28, 27, 29, 28, 28, 27, 41]);
    const concerns = detectConcerns({ profile: profile(), episodes, logs: {} });
    expect(concerns.find((c) => c.kind === 'cycle_length_shift')).toBeUndefined();
  });

  it('stays silent when the history never had a stable baseline', () => {
    const episodes = episodesFrom([22, 38, 25, 41, 24, 36, 45, 21, 44]);
    const concerns = detectConcerns({ profile: profile(), episodes, logs: {} });
    expect(concerns.find((c) => c.kind === 'cycle_length_shift')).toBeUndefined();
  });
});

describe('pain concern weighs impact and repetition, not raw day count', () => {
  it('ignores moderate pain that did not affect daily life', () => {
    const episodes = episodesFrom([28, 28, 28, 28]);
    const logs: Record<string, DailyLog> = {};
    for (const episode of episodes) {
      for (let day = 0; day < 4; day += 1) {
        const date = addLocalDays(episode.startDate, day);
        logs[date] = log(date, { pain: 'moderate', functionalImpact: 'none' });
      }
    }
    const concerns = detectConcerns({ profile: profile(), episodes, logs });
    expect(
      concerns.find((c) => c.kind === 'repeated_disruptive_pain'),
    ).toBeUndefined();
  });

  it('flags severe activity-limiting pain repeating across cycles', () => {
    const episodes = episodesFrom([28, 28, 28, 28]);
    const concerns = detectConcerns({
      profile: profile(),
      episodes,
      logs: disruptivePainLogs(episodes, 4, 3),
    });
    const pain = concerns.find((c) => c.kind === 'repeated_disruptive_pain');
    expect(pain).toBeDefined();
    expect(pain?.evidence).toMatch(/usual activities/);
    expect(pain?.evidence).toMatch(/around the start of your period/);
    expect(pain?.actionLabel).toBe('Export a summary');
  });

  it('does not flag disruptive pain confined to one cycle', () => {
    const episodes = episodesFrom([28, 28, 28, 28]);
    const concerns = detectConcerns({
      profile: profile(),
      episodes,
      logs: disruptivePainLogs(episodes, 1, 6),
    });
    expect(
      concerns.find((c) => c.kind === 'repeated_disruptive_pain'),
    ).toBeUndefined();
  });
});

describe('the concern layer never crosses into diagnosis', () => {
  function everyConcernText() {
    const painEpisodes = episodesFrom([28, 28, 28, 28]);
    const shiftEpisodes = episodesFrom([28, 27, 29, 28, 28, 27, 41, 42, 40]);
    return [
      ...detectConcerns({
        profile: profile(),
        episodes: painEpisodes,
        logs: disruptivePainLogs(painEpisodes, 4, 3),
      }),
      ...detectConcerns({
        profile: profile(),
        episodes: shiftEpisodes,
        logs: {},
      }),
    ];
  }

  it('emits at least one concern to actually test', () => {
    expect(everyConcernText().length).toBeGreaterThan(0);
  });

  it('never names a condition in generated concern copy', () => {
    for (const concern of everyConcernText()) {
      const text = `${concern.title} ${concern.evidence} ${concern.body}`
        .toLowerCase();
      for (const name of CONDITION_NAMES_FORBIDDEN_IN_CONCERNS) {
        expect(text).not.toContain(name);
      }
    }
  });

  it('always says the cause cannot be determined and points to a clinician', () => {
    for (const concern of everyConcernText()) {
      expect(concern.body).toMatch(/cannot determine the cause/i);
      expect(concern.body).toMatch(/healthcare professional/i);
    }
  });

  it('never asserts or predicts a condition', () => {
    for (const concern of everyConcernText()) {
      const text = `${concern.evidence} ${concern.body}`.toLowerCase();
      expect(text).not.toMatch(/you (may|might|could) have/);
      expect(text).not.toMatch(/diagnos/);
      expect(text).not.toMatch(/suggests that you/);
    }
  });

  it('offers the export so the conversation has evidence behind it', () => {
    for (const concern of everyConcernText()) {
      expect(concern.actionHref).toBe('/health-summary');
    }
  });
});

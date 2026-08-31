import {
  coalesceOutbox,
  createMemoryStorage,
  enqueueOutbox,
  flushOutbox,
  isNewerIso,
  loadOutbox,
  saveOutbox,
  setOutboxStorage,
  wipeSignedInLocal,
  type OutboxOp,
} from '../src/sync/outbox';
import type { DailyLog } from '../src/types';

const user = 'user-1';

function log(date: string, extra: Partial<DailyLog> = {}): DailyLog {
  return {
    id: date,
    date,
    updatedAt: '2026-08-31T12:00:00.000Z',
    ...extra,
  };
}

beforeEach(() => {
  setOutboxStorage(createMemoryStorage());
});

describe('outbox coalesce', () => {
  test('a later log for the same date replaces the earlier one', () => {
    const first: OutboxOp = {
      id: 'a',
      kind: 'upsertLog',
      log: log('2026-08-31', { mood: 'okay' }),
      episodes: [],
    };
    const next = coalesceOutbox([first], {
      kind: 'upsertLog',
      log: log('2026-08-31', { mood: 'good' }),
      episodes: [],
    });
    expect(next).toHaveLength(1);
    expect(next[0].kind).toBe('upsertLog');
    if (next[0].kind === 'upsertLog') {
      expect(next[0].log.mood).toBe('good');
    }
  });

  test('deleting a date drops an unsynced upsert for that date', () => {
    const queued: OutboxOp[] = [
      {
        id: 'a',
        kind: 'upsertLog',
        log: log('2026-08-31'),
        episodes: [],
      },
    ];
    const next = coalesceOutbox(queued, {
      kind: 'deleteLog',
      date: '2026-08-31',
      episodes: [],
    });
    expect(next).toHaveLength(1);
    expect(next[0].kind).toBe('deleteLog');
  });
});

describe('outbox persistence', () => {
  test('enqueue then load round-trips for one signed-in user', async () => {
    await enqueueOutbox(user, {
      kind: 'profile',
      profile: {
        timezone: 'UTC',
        locale: 'en',
        onboardingComplete: true,
        trackingGoals: [],
        fertilityEnabled: false,
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-31T00:00:00.000Z',
      },
    });
    const ops = await loadOutbox(user);
    expect(ops).toHaveLength(1);
    expect(ops[0].kind).toBe('profile');
  });

  test('wipe removes only that user’s queue', async () => {
    await enqueueOutbox(user, {
      kind: 'manualPeriod',
      episodes: [],
    });
    await enqueueOutbox('user-2', {
      kind: 'manualPeriod',
      episodes: [],
    });
    await wipeSignedInLocal(user);
    expect(await loadOutbox(user)).toEqual([]);
    expect(await loadOutbox('user-2')).toHaveLength(1);
  });

  test('flush executes in order and clears on success', async () => {
    await saveOutbox(user, [
      {
        id: '1',
        kind: 'manualPeriod',
        episodes: [],
      },
      {
        id: '2',
        kind: 'profile',
        profile: {
          timezone: 'UTC',
          locale: 'en',
          onboardingComplete: true,
          trackingGoals: [],
          fertilityEnabled: false,
          createdAt: '2026-08-01T00:00:00.000Z',
          updatedAt: '2026-08-31T00:00:00.000Z',
        },
      },
    ]);
    const kinds: string[] = [];
    await flushOutbox(user, async (op) => {
      kinds.push(op.kind);
    });
    expect(kinds).toEqual(['manualPeriod', 'profile']);
    expect(await loadOutbox(user)).toEqual([]);
  });

  test('flush keeps the failed op and everything after it', async () => {
    await saveOutbox(user, [
      { id: '1', kind: 'manualPeriod', episodes: [] },
      { id: '2', kind: 'manualPeriod', episodes: [] },
    ]);
    await expect(
      flushOutbox(user, async (op) => {
        if (op.id === '2') throw new Error('network');
      }),
    ).rejects.toThrow('network');
    const remaining = await loadOutbox(user);
    expect(remaining.map((op) => op.id)).toEqual(['2']);
  });

  test('last-write-wins compares ISO timestamps', () => {
    expect(isNewerIso('2026-08-31T12:00:00.000Z', '2026-08-31T11:00:00.000Z')).toBe(
      true,
    );
    expect(isNewerIso('2026-08-31T10:00:00.000Z', '2026-08-31T11:00:00.000Z')).toBe(
      false,
    );
  });
});

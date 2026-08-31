import AsyncStorage from '@react-native-async-storage/async-storage';
import { createId } from '@/utils/id';
import type {
  AppearancePrefs,
  DailyLog,
  NotificationPrefs,
  PeriodEpisode,
  PreparationItem,
  Profile,
} from '@/types';
import type { HydratedCloudAccount } from './types';

/**
 * Signed-in only. Never use the retired `luma-store-v1` anonymous key.
 * Queue and cache are scoped to the Appwrite user id so a second account
 * on this device cannot read the first person's logs.
 */
export const OUTBOX_KEY_PREFIX = 'luma-outbox-v1:';
export const ACCOUNT_CACHE_KEY_PREFIX = 'luma-account-cache-v1:';

export const PENDING_SYNC_COPY =
  'Saved on this device — it will sync when you’re back online';

export type OutboxStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export type OutboxOp =
  | {
      id: string;
      kind: 'upsertLog';
      log: DailyLog;
      episodes: PeriodEpisode[];
    }
  | {
      id: string;
      kind: 'deleteLog';
      date: string;
      episodes: PeriodEpisode[];
    }
  | {
      id: string;
      kind: 'manualPeriod';
      episodes: PeriodEpisode[];
    }
  | {
      id: string;
      kind: 'profile';
      profile: Profile;
    }
  | {
      id: string;
      kind: 'preferences';
      appearance: AppearancePrefs;
      notifications: NotificationPrefs;
      favouriteSymptoms: string[];
    }
  | {
      id: string;
      kind: 'preparation';
      item: PreparationItem;
    };

export type OutboxOpInput = {
  [K in OutboxOp['kind']]: Omit<Extract<OutboxOp, { kind: K }>, 'id'>;
}[OutboxOp['kind']];

let storage: OutboxStorage = AsyncStorage;

export function setOutboxStorage(next: OutboxStorage): void {
  storage = next;
}

export function createMemoryStorage(
  seed: Record<string, string> = {},
): OutboxStorage {
  const map = new Map(Object.entries(seed));
  return {
    getItem: async (key) => map.get(key) ?? null,
    setItem: async (key, value) => {
      map.set(key, value);
    },
    removeItem: async (key) => {
      map.delete(key);
    },
  };
}

function outboxKey(userId: string): string {
  return `${OUTBOX_KEY_PREFIX}${userId}`;
}

function cacheKey(userId: string): string {
  return `${ACCOUNT_CACHE_KEY_PREFIX}${userId}`;
}

function opKey(op: OutboxOpInput | OutboxOp): string {
  switch (op.kind) {
    case 'upsertLog':
      return `upsertLog:${op.log.date}`;
    case 'deleteLog':
      return `deleteLog:${op.date}`;
    case 'manualPeriod':
      return 'manualPeriod';
    case 'profile':
      return 'profile';
    case 'preferences':
      return 'preferences';
    case 'preparation':
      return `preparation:${op.item.id}`;
  }
}

/**
 * Keeps one pending write per logical target. A later log for the same date
 * replaces an earlier one so a flaky evening does not enqueue five copies.
 */
export function coalesceOutbox(
  ops: OutboxOp[],
  next: OutboxOpInput & { id?: string },
): OutboxOp[] {
  const incoming: OutboxOp = { ...next, id: next.id ?? createId() };
  const nextKey = opKey(incoming);
  const without = ops.filter((op) => {
    if (opKey(op) === nextKey) return false;
    // A delete supersedes an unsynced upsert for that date, and vice versa.
    if (incoming.kind === 'deleteLog' && op.kind === 'upsertLog') {
      return op.log.date !== incoming.date;
    }
    if (incoming.kind === 'upsertLog' && op.kind === 'deleteLog') {
      return op.date !== incoming.log.date;
    }
    return true;
  });
  return [...without, incoming];
}

export async function loadOutbox(userId: string): Promise<OutboxOp[]> {
  try {
    const raw = await storage.getItem(outboxKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as OutboxOp[]) : [];
  } catch {
    return [];
  }
}

export async function saveOutbox(
  userId: string,
  ops: OutboxOp[],
): Promise<void> {
  if (!ops.length) {
    await storage.removeItem(outboxKey(userId));
    return;
  }
  await storage.setItem(outboxKey(userId), JSON.stringify(ops));
}

export async function enqueueOutbox(
  userId: string,
  op: OutboxOpInput,
): Promise<OutboxOp[]> {
  const next = coalesceOutbox(await loadOutbox(userId), op);
  await saveOutbox(userId, next);
  return next;
}

export async function loadAccountCache(
  userId: string,
): Promise<HydratedCloudAccount | null> {
  try {
    const raw = await storage.getItem(cacheKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as HydratedCloudAccount;
  } catch {
    return null;
  }
}

export async function saveAccountCache(
  userId: string,
  account: HydratedCloudAccount,
): Promise<void> {
  await storage.setItem(cacheKey(userId), JSON.stringify(account));
}

/** Sign-out, account delete, and a different user signing in all wipe this. */
export async function wipeSignedInLocal(userId: string): Promise<void> {
  await storage.removeItem(outboxKey(userId));
  await storage.removeItem(cacheKey(userId));
}

export async function flushOutbox(
  userId: string,
  execute: (op: OutboxOp) => Promise<void>,
): Promise<void> {
  const ops = await loadOutbox(userId);
  const remaining: OutboxOp[] = [];
  let failed = false;
  for (const op of ops) {
    if (failed) {
      remaining.push(op);
      continue;
    }
    try {
      await execute(op);
    } catch (error) {
      failed = true;
      remaining.push(op);
      await saveOutbox(userId, [...remaining, ...ops.slice(ops.indexOf(op) + 1)]);
      throw error;
    }
  }
  await saveOutbox(userId, remaining);
}

export function isNewerIso(candidate: string, incumbent?: string): boolean {
  if (!incumbent) return true;
  return candidate >= incumbent;
}

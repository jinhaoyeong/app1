import type { NotificationPrefs, PeriodPrediction } from '@/types';
import { addLocalDays, parseLocalDate } from '@/utils/dates';

/**
 * Categories Luma can actually schedule ahead of time.
 *
 * `patternDiscovered` and `importantChange` are deliberately absent: both
 * depend on noticing something in the data, which requires the app to run.
 * Without a background task there is no honest way to promise delivery, so
 * they surface in the app instead and the settings screen says so.
 */
export type ScheduledCategory =
  'periodPrediction' | 'periodPreparation' | 'dailyLog';

export type PlannedNotification = {
  /**
   * Stable identity. Everything that affects the notification is encoded here,
   * so a changed prediction or a switch to discreet wording produces a new id —
   * which reconciliation then cancels and replaces rather than duplicating.
   */
  id: string;
  category: ScheduledCategory;
  title: string;
  body: string;
  /** Absolute instant to fire, in epoch milliseconds. */
  triggerAt: number;
  /** Daily reminders repeat; the rest are one-shot. */
  repeats: boolean;
};

export type ExistingNotification = { id: string; triggerAt: number };

export type Reconciliation = {
  toCancel: string[];
  toSchedule: PlannedNotification[];
};

/** Hours are local wall-clock, chosen to be useful rather than intrusive. */
const PREDICTION_HOUR = 9;
const PREPARATION_HOUR = 18;
const DAILY_LOG_HOUR = 20;

/** Days before the window opens that each reminder fires. */
const PREDICTION_LEAD_DAYS = 1;
const PREPARATION_LEAD_DAYS = 3;

/**
 * A tolerance for comparing trigger instants. Anything larger than a minute
 * means the wall-clock target really moved — a timezone change, a DST
 * transition, or a shifted prediction — and the notification is rebuilt.
 */
const TRIGGER_TOLERANCE_MS = 60_000;

const DISCREET_TITLE = 'Luma';
const DISCREET_BODY = 'You have a Luma update.';

/** Discreet mode always wins. Detailed lock-screen text is opt-in. */
export function lockScreenIsDiscreet(
  discreetMode: boolean,
  showDetailedText: boolean,
): boolean {
  return discreetMode || !showDetailedText;
}

/**
 * Converts a local calendar date plus an hour into an absolute instant.
 *
 * Built from local date parts rather than UTC arithmetic so the notification
 * lands at the intended wall-clock time in whatever zone the device is in, and
 * so a DST transition between now and then resolves the way the platform's own
 * calendar does.
 */
export function localInstant(isoDate: string, hour: number): number {
  const d = parseLocalDate(isoDate);
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
}

function text(
  discreet: boolean,
  title: string,
  body: string,
): { title: string; body: string } {
  // Applied at planning time, so the stored notification never contains
  // period detail the user asked to keep off their lock screen.
  return discreet
    ? { title: DISCREET_TITLE, body: DISCREET_BODY }
    : { title, body };
}

/**
 * The full set of notifications that *should* exist right now.
 *
 * Pure: same inputs always give the same plan, which is what makes scheduling
 * idempotent — re-running it on every render or resume produces no change.
 */
export function buildNotificationPlan(options: {
  prefs: NotificationPrefs;
  prediction?: PeriodPrediction | null;
  discreet: boolean;
  now: number;
}): PlannedNotification[] {
  const { prefs, prediction, discreet, now } = options;
  const plan: PlannedNotification[] = [];
  const variant = discreet ? 'discreet' : 'detailed';

  const hasPersonalWindow =
    !!prediction && prediction.confidenceBand !== 'learning';

  if (hasPersonalWindow && prefs.periodPrediction) {
    const date = addLocalDays(prediction.lowerBound, -PREDICTION_LEAD_DAYS);
    const triggerAt = localInstant(date, PREDICTION_HOUR);
    if (triggerAt > now) {
      plan.push({
        id: `periodPrediction:${date}:${variant}`,
        category: 'periodPrediction',
        ...text(
          discreet,
          'Your window opens tomorrow',
          'Your estimated period window starts tomorrow. Estimates come from your own history.',
        ),
        triggerAt,
        repeats: false,
      });
    }
  }

  if (hasPersonalWindow && prefs.periodPreparation) {
    const date = addLocalDays(prediction.lowerBound, -PREPARATION_LEAD_DAYS);
    const triggerAt = localInstant(date, PREPARATION_HOUR);
    if (triggerAt > now) {
      plan.push({
        id: `periodPreparation:${date}:${variant}`,
        category: 'periodPreparation',
        ...text(
          discreet,
          'A few days to go',
          'Your estimated window opens in a few days, if you want to prepare.',
        ),
        triggerAt,
        repeats: false,
      });
    }
  }

  if (prefs.dailyLog) {
    // Repeating, so the id carries no date — only the wording variant.
    plan.push({
      id: `dailyLog:${variant}`,
      category: 'dailyLog',
      ...text(
        discreet,
        'A quiet moment',
        'Anything worth noting today? Skipping is fine.',
      ),
      triggerAt: nextDailyInstant(now, DAILY_LOG_HOUR),
      repeats: true,
    });
  }

  return plan;
}

export type DueReminder = PlannedNotification & {
  href: '/log' | '/preparation';
};

/**
 * In-app surface for what would have fired today. Unlike the OS plan, items
 * whose hour has already passed still belong on Today until they are dismissed.
 */
export function dueFromPlan(options: {
  prefs: NotificationPrefs;
  prediction?: PeriodPrediction | null;
  discreet: boolean;
  now: number;
  todayLogged: boolean;
  asOf: string;
}): DueReminder[] {
  const { prefs, prediction, discreet, todayLogged, asOf } = options;
  const due: DueReminder[] = [];
  const variant = discreet ? 'discreet' : 'detailed';
  const hasPersonalWindow =
    !!prediction && prediction.confidenceBand !== 'learning';

  if (hasPersonalWindow && prefs.periodPrediction) {
    const date = addLocalDays(prediction.lowerBound, -PREDICTION_LEAD_DAYS);
    if (date === asOf) {
      due.push({
        id: `periodPrediction:${date}:${variant}`,
        category: 'periodPrediction',
        ...text(
          discreet,
          'Your window opens tomorrow',
          'Your estimated period window starts tomorrow. Estimates come from your own history.',
        ),
        triggerAt: localInstant(date, PREDICTION_HOUR),
        repeats: false,
        href: '/preparation',
      });
    }
  }

  if (hasPersonalWindow && prefs.periodPreparation) {
    const date = addLocalDays(prediction.lowerBound, -PREPARATION_LEAD_DAYS);
    if (date === asOf) {
      due.push({
        id: `periodPreparation:${date}:${variant}`,
        category: 'periodPreparation',
        ...text(
          discreet,
          'A few days to go',
          'Your estimated window opens in a few days, if you want to prepare.',
        ),
        triggerAt: localInstant(date, PREPARATION_HOUR),
        repeats: false,
        href: '/preparation',
      });
    }
  }

  if (prefs.dailyLog && !todayLogged) {
    due.push({
      id: `dailyLog:${variant}`,
      category: 'dailyLog',
      ...text(
        discreet,
        'A quiet moment',
        'Anything worth noting today? Skipping is fine.',
      ),
      triggerAt: nextDailyInstant(options.now, DAILY_LOG_HOUR),
      repeats: true,
      href: '/log',
    });
  }

  return due;
}

/** The next occurrence of a wall-clock hour, today if it has not passed. */
export function nextDailyInstant(now: number, hour: number): number {
  const d = new Date(now);
  d.setHours(hour, 0, 0, 0);
  if (d.getTime() <= now) d.setDate(d.getDate() + 1);
  return d.getTime();
}

/**
 * Diffs what should exist against what the OS currently holds.
 *
 * Anything scheduled that is not in the plan is cancelled — that covers a
 * disabled category, a moved prediction, a wording change, and a full reset.
 * Anything already scheduled at the right instant is left alone, which is what
 * prevents duplicates when this runs repeatedly.
 */
export function reconcile(
  desired: PlannedNotification[],
  existing: ExistingNotification[],
): Reconciliation {
  const existingById = new Map(existing.map((e) => [e.id, e]));
  const desiredIds = new Set(desired.map((d) => d.id));

  const toSchedule = desired.filter((d) => {
    const current = existingById.get(d.id);
    if (!current) return true;
    // A repeating reminder is pinned to a wall-clock hour by the platform, and
    // its next instant naturally moves every day. Comparing instants would
    // rebuild it on every sync, so identity alone settles it.
    if (d.repeats) return false;
    // A one-shot whose instant moved: the device changed zone, crossed a DST
    // boundary, or the prediction shifted underneath it.
    return Math.abs(current.triggerAt - d.triggerAt) > TRIGGER_TOLERANCE_MS;
  });

  const rescheduledIds = new Set(toSchedule.map((d) => d.id));
  const toCancel = existing
    .filter((e) => !desiredIds.has(e.id) || rescheduledIds.has(e.id))
    .map((e) => e.id);

  return { toCancel, toSchedule };
}

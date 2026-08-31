import { Platform } from 'react-native';
import type * as NotificationsModule from 'expo-notifications';
import type { NotificationPrefs, PeriodPrediction } from '@/types';
import {
  buildNotificationPlan,
  lockScreenIsDiscreet,
  reconcile,
  type ExistingNotification,
  type PlannedNotification,
} from './plan';

export type PermissionState = 'granted' | 'denied' | 'undetermined';

/** Android needs an explicit channel or notifications post silently. */
const ANDROID_CHANNEL = 'luma-cycle';

export function notificationsSupported(): boolean {
  // expo-notifications has no scheduling on web, and silently no-oping would
  // be exactly the kind of empty promise this app is trying to avoid.
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

/**
 * Loaded on demand, never at module scope: importing expo-notifications on web
 * emits a push-token warning on every launch, and a noisy console hides real
 * regressions. Every caller is already async, so this costs nothing.
 */
async function loadNotifications(): Promise<typeof NotificationsModule | null> {
  if (!notificationsSupported()) return null;
  return import('expo-notifications');
}

async function ensureAndroidChannel(Notifications: typeof NotificationsModule) {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
    name: 'Cycle reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    // No custom sound or lights: a period reminder should not announce itself
    // across a room.
    vibrationPattern: [0, 200],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  });
}

export async function getPermissionState(): Promise<PermissionState> {
  const Notifications = await loadNotifications();
  if (!Notifications) return 'denied';
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status as PermissionState;
  } catch {
    return 'denied';
  }
}

/**
 * Asks for permission — only ever called from the moment a user turns a
 * category on, never at app start.
 */
export async function requestPermission(): Promise<PermissionState> {
  const Notifications = await loadNotifications();
  if (!Notifications) return 'denied';
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.status === 'granted') {
      await ensureAndroidChannel(Notifications);
      return 'granted';
    }
    // iOS only shows the system prompt once; afterwards this resolves to the
    // stored answer, which the settings screen surfaces rather than looping.
    const asked = await Notifications.requestPermissionsAsync();
    if (asked.status === 'granted') await ensureAndroidChannel(Notifications);
    return asked.status as PermissionState;
  } catch {
    return 'denied';
  }
}

async function readScheduled(
  Notifications: typeof NotificationsModule,
): Promise<ExistingNotification[]> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.map((s) => ({
    id: s.identifier,
    triggerAt: triggerInstant(s.trigger),
  }));
}

/** Normalises the platform's trigger shapes to an epoch instant. */
function triggerInstant(trigger: unknown): number {
  if (!trigger || typeof trigger !== 'object') return 0;
  const t = trigger as { type?: string; value?: number; date?: number };
  if (typeof t.value === 'number') return t.value;
  if (typeof t.date === 'number') return t.date;
  return 0;
}

async function schedule(
  Notifications: typeof NotificationsModule,
  item: PlannedNotification,
) {
  await Notifications.scheduleNotificationAsync({
    identifier: item.id,
    content: {
      title: item.title,
      body: item.body,
      ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL } : {}),
    },
    trigger: item.repeats
      ? {
          // A daily trigger is pinned to wall-clock time by the OS, so it
          // follows the device across timezone and DST changes on its own.
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: new Date(item.triggerAt).getHours(),
          minute: 0,
        }
      : {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(item.triggerAt),
        },
  });
}

export type SyncResult = {
  supported: boolean;
  permission: PermissionState;
  scheduled: number;
  cancelled: number;
};

/**
 * Brings the OS's scheduled notifications in line with what preferences and
 * the current prediction say should exist.
 *
 * Safe to call as often as you like — on resume, after a log, after a settings
 * change. Identical desired state produces zero writes, which is what stops
 * duplicates accumulating.
 */
export async function syncNotifications(options: {
  prefs: NotificationPrefs;
  prediction?: PeriodPrediction | null;
  discreet: boolean;
  now?: number;
}): Promise<SyncResult> {
  const Notifications = await loadNotifications();
  if (!Notifications) {
    return {
      supported: false,
      permission: 'denied',
      scheduled: 0,
      cancelled: 0,
    };
  }

  const permission = await getPermissionState();
  const now = options.now ?? Date.now();

  // Without permission nothing can be delivered, so make sure nothing is left
  // queued from when it was granted.
  const desired =
    permission === 'granted'
      ? buildNotificationPlan({
          prefs: options.prefs,
          prediction: options.prediction,
          discreet: lockScreenIsDiscreet(
            options.discreet,
            options.prefs.showDetailedText,
          ),
          now,
        })
      : [];

  try {
    const existing = await readScheduled(Notifications);
    const { toCancel, toSchedule } = reconcile(desired, existing);

    for (const id of toCancel) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
    for (const item of toSchedule) {
      await schedule(Notifications, item);
    }

    return {
      supported: true,
      permission,
      scheduled: toSchedule.length,
      cancelled: toCancel.length,
    };
  } catch {
    return { supported: true, permission, scheduled: 0, cancelled: 0 };
  }
}

/** Used by delete-all and reset: nothing may outlive the data it describes. */
export async function cancelAllNotifications(): Promise<void> {
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Nothing further to do; the queue is best-effort at this point.
  }
}

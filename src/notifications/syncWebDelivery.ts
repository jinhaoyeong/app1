import { Platform } from 'react-native';
import type { NotificationPrefs, PeriodPrediction } from '@/types';
import { useLumaStore } from '@/store/lumaStore';
import {
  buildNotificationPlan,
  lockScreenIsDiscreet,
} from './plan';
import { pushScheduleConfigured, upsertPushSchedule } from './pushSchedule';
import {
  registerLumaServiceWorker,
  subscribeWebPush,
  webPushAvailable,
  webPushCapability,
} from './webPush';

export async function syncWebPushDelivery(options: {
  prefs: NotificationPrefs;
  prediction?: PeriodPrediction | null;
  discreet: boolean;
}): Promise<void> {
  if (Platform.OS !== 'web') return;
  await registerLumaServiceWorker();
  const capability = webPushCapability();
  if (!capability.available || capability.permission !== 'granted') return;
  if (!webPushAvailable()) return;
  if (!pushScheduleConfigured()) return;
  const subscription = await subscribeWebPush();
  if (!subscription) return;
  const userId = useLumaStore.getState().cloudUserId;
  if (!userId) return;
  const items = buildNotificationPlan({
    prefs: options.prefs,
    prediction: options.prediction,
    discreet: lockScreenIsDiscreet(
      options.discreet,
      options.prefs.showDetailedText,
    ),
    now: Date.now(),
  });
  await upsertPushSchedule({ userId, subscription, items });
}

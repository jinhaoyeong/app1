import { Platform } from 'react-native';

export type WebPushCapability = {
  available: boolean;
  standalone: boolean;
  permission: NotificationPermission | 'unsupported';
  reason?: string;
};

function browserPush(): typeof window.PushManager | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.PushManager;
}

export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  const media = window.matchMedia?.('(display-mode: standalone)')?.matches;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean })
    .standalone;
  return Boolean(media || iosStandalone);
}

export function webPushAvailable(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  return (
    'Notification' in window &&
    'serviceWorker' in navigator &&
    !!browserPush()
  );
}

export function webPushCapability(): WebPushCapability {
  if (!webPushAvailable()) {
    return {
      available: false,
      standalone: false,
      permission: 'unsupported',
      reason: 'This browser cannot receive Web Push.',
    };
  }
  const standalone = isStandalonePwa();
  return {
    available: true,
    standalone,
    permission: Notification.permission,
    reason: standalone
      ? undefined
      : 'On iPhone, add Luma to your Home Screen, then enable reminders from inside that icon.',
  };
}

export async function registerLumaServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!webPushAvailable()) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export async function requestWebPushPermission(): Promise<
  'granted' | 'denied' | 'undetermined'
> {
  if (!webPushAvailable()) return 'denied';
  try {
    const result = await Notification.requestPermission();
    if (result === 'granted') return 'granted';
    if (result === 'denied') return 'denied';
    return 'undetermined';
  } catch {
    return 'denied';
  }
}

export type PushSubscriptionJSON = {
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
};

export async function subscribeWebPush(): Promise<PushSubscriptionJSON | null> {
  const vapid = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  if (!vapid) return null;
  const registration = await registerLumaServiceWorker();
  if (!registration) return null;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
    }));
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return null;
  return {
    endpoint: json.endpoint,
    expirationTime: json.expirationTime ?? null,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  };
}

export async function unsubscribeWebPush(): Promise<void> {
  if (!webPushAvailable()) return;
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  await subscription?.unsubscribe();
}

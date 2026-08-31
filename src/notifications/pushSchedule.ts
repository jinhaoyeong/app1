import { Platform } from 'react-native';
import { Client, Databases, ID, Permission, Query, Role } from 'appwrite';
import { getAppwriteConfig } from '@/auth/appwrite';
import type { PlannedNotification } from './plan';
import type { PushSubscriptionJSON } from './webPush';

export type PushScheduleDocument = {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  items: string;
  updated_at: string;
};

export function pushScheduleConfigured(): boolean {
  return Boolean(
    process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID?.trim() &&
      process.env.EXPO_PUBLIC_APPWRITE_PUSH_COLLECTION_ID?.trim(),
  );
}

function ids(): { databaseId: string; collectionId: string } | null {
  const databaseId = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID?.trim();
  const collectionId =
    process.env.EXPO_PUBLIC_APPWRITE_PUSH_COLLECTION_ID?.trim();
  if (!databaseId || !collectionId) return null;
  return { databaseId, collectionId };
}

function databases(): Databases | null {
  if (Platform.OS !== 'web') return null;
  const config = getAppwriteConfig();
  const target = ids();
  if (!config || !target) return null;
  const client = new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId);
  return new Databases(client);
}

/**
 * Writes only the push subscription and the already-planned due items.
 * The cron must never read the lumaState health blob.
 */
export async function upsertPushSchedule(options: {
  userId: string;
  subscription: PushSubscriptionJSON;
  items: PlannedNotification[];
}): Promise<boolean> {
  const db = databases();
  const target = ids();
  if (!db || !target) return false;
  const payload: PushScheduleDocument = {
    user_id: options.userId,
    endpoint: options.subscription.endpoint,
    p256dh: options.subscription.keys.p256dh,
    auth: options.subscription.keys.auth,
    items: JSON.stringify(options.items),
    updated_at: new Date().toISOString(),
  };
  try {
    const existing = await db.listDocuments(
      target.databaseId,
      target.collectionId,
      [Query.equal('user_id', options.userId), Query.limit(1)],
    );
    if (existing.documents[0]) {
      await db.updateDocument(
        target.databaseId,
        target.collectionId,
        existing.documents[0].$id,
        payload,
      );
    } else {
      await db.createDocument(
        target.databaseId,
        target.collectionId,
        ID.unique(),
        payload,
        [
          Permission.read(Role.user(options.userId)),
          Permission.update(Role.user(options.userId)),
          Permission.delete(Role.user(options.userId)),
        ],
      );
    }
    return true;
  } catch {
    return false;
  }
}

export async function clearPushSchedule(userId: string): Promise<void> {
  const db = databases();
  const target = ids();
  if (!db || !target) return;
  try {
    const existing = await db.listDocuments(
      target.databaseId,
      target.collectionId,
      [Query.equal('user_id', userId), Query.limit(8)],
    );
    await Promise.all(
      existing.documents.map((doc) =>
        db.deleteDocument(target.databaseId, target.collectionId, doc.$id),
      ),
    );
  } catch {
    // Best-effort: a leftover schedule would send discreet copy at worst.
  }
}

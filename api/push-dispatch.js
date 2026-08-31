/**
 * Vercel cron: send due Web Push rows without reading Luma health data.
 * Set APPWRITE_* and VAPID_* in the Vercel project. The collection must
 * contain only user_id, endpoint, p256dh, auth, items, updated_at.
 */
import webpush from 'web-push';

const DISCREET = { title: 'Luma', body: 'You have a Luma update.' };

function env(name) {
  return process.env[name]?.trim() || '';
}

async function listDueDocuments({
  endpoint,
  projectId,
  apiKey,
  databaseId,
  collectionId,
}) {
  // Appwrite 1.5 onward takes queries as JSON objects; the older
  // `limit(100)` string form comes back as a 400 syntax error.
  const query = encodeURIComponent(
    JSON.stringify({ method: 'limit', values: [100] }),
  );
  const url = `${endpoint}/databases/${databaseId}/collections/${collectionId}/documents?queries[]=${query}`;
  const res = await fetch(url, {
    headers: {
      'X-Appwrite-Project': projectId,
      'X-Appwrite-Key': apiKey,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(`Appwrite list failed (${res.status})`);
  }
  const body = await res.json();
  return body.documents ?? [];
}

async function patchItems(
  docId,
  items,
  { endpoint, projectId, apiKey, databaseId, collectionId },
) {
  const url = `${endpoint}/databases/${databaseId}/collections/${collectionId}/documents/${docId}`;
  await fetch(url, {
    method: 'PATCH',
    headers: {
      'X-Appwrite-Project': projectId,
      'X-Appwrite-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        items: JSON.stringify(items),
        updated_at: new Date().toISOString(),
      },
    }),
  });
}

export default async function handler(req, res) {
  const secret = env('CRON_SECRET');
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    res.status(401).json({ ok: false, error: 'unauthorized' });
    return;
  }

  const vapidPublic =
    env('VAPID_PUBLIC_KEY') || env('EXPO_PUBLIC_VAPID_PUBLIC_KEY');
  const vapidPrivate = env('VAPID_PRIVATE_KEY');
  const vapidSubject = env('VAPID_SUBJECT') || 'mailto:luma@localhost';
  const endpoint =
    env('APPWRITE_ENDPOINT') || env('EXPO_PUBLIC_APPWRITE_ENDPOINT');
  const projectId =
    env('APPWRITE_PROJECT_ID') || env('EXPO_PUBLIC_APPWRITE_PROJECT_ID');
  const apiKey = env('APPWRITE_API_KEY');
  const databaseId =
    env('APPWRITE_DATABASE_ID') || env('EXPO_PUBLIC_APPWRITE_DATABASE_ID');
  const collectionId =
    env('APPWRITE_PUSH_COLLECTION_ID') ||
    env('EXPO_PUBLIC_APPWRITE_PUSH_COLLECTION_ID');

  if (
    !vapidPublic ||
    !vapidPrivate ||
    !endpoint ||
    !projectId ||
    !apiKey ||
    !databaseId ||
    !collectionId
  ) {
    res.status(501).json({
      ok: false,
      error:
        'Web Push is not configured. Add VAPID and Appwrite push collection env vars.',
    });
    return;
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const now = Date.now();
  const documents = await listDueDocuments({
    endpoint,
    projectId,
    apiKey,
    databaseId,
    collectionId,
  });

  let sent = 0;
  for (const doc of documents) {
    let items = [];
    try {
      items = JSON.parse(doc.items || '[]');
    } catch {
      items = [];
    }
    const due = items.filter(
      (item) => typeof item.triggerAt === 'number' && item.triggerAt <= now,
    );
    const later = items.filter((item) => !due.includes(item));
    for (const item of due) {
      try {
        await webpush.sendNotification(
          {
            endpoint: doc.endpoint,
            keys: { p256dh: doc.p256dh, auth: doc.auth },
          },
          JSON.stringify({
            title: item.title || DISCREET.title,
            body: item.body || DISCREET.body,
            url: '/',
          }),
        );
        sent += 1;
      } catch {
        // Expired subscriptions are left for the next client upsert to replace.
      }
    }
    if (due.length) {
      await patchItems(doc.$id, later, {
        endpoint,
        projectId,
        apiKey,
        databaseId,
        collectionId,
      });
    }
  }

  res.status(200).json({ ok: true, sent, scanned: documents.length });
}

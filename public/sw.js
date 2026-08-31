self.addEventListener('push', (event) => {
  let payload = { title: 'Luma', body: 'You have a Luma update.', url: '/' };
  try {
    if (event.data) {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    }
  } catch {
    // Keep the discreet default if the payload is not JSON.
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icon.png',
      badge: '/apple-touch-icon.png',
      data: { url: payload.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => 'focus' in client);
      if (existing) {
        existing.navigate?.(url);
        return existing.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});

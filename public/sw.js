/* Welcome 24 — service worker для Web Push.
 * Минимальный: ловит push-сообщения и показывает уведомление,
 * по клику открывает/фокусирует портал на нужном URL (deep-link).
 * Кэширования намеренно нет — портал всегда грузится свежим. */

self.addEventListener('install', (event) => {
  // Активируемся сразу, не ждём закрытия старых вкладок.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Welcome 24', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Welcome 24';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/' },
    tag: data.tag || undefined,        // одинаковый tag схлопывает дубли
    renotify: !!data.tag,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Если портал уже открыт — фокусируем и навигируем.
      for (const client of clients) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client && targetUrl !== '/') {
            client.navigate(targetUrl).catch(() => {});
          }
          return;
        }
      }
      // Иначе открываем новое окно.
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    }),
  );
});

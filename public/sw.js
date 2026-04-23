self.addEventListener('push', e => {
  const data = e.data?.json() || {};
  self.registration.showNotification(data.title || 'Tony Tasks', {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
  });
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('/'));
});

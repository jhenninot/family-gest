// Service Worker Push Notifications & Notification Click Handlers for FamilyGest
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'FamilyGest';
    const options = {
      body: data.body || 'Nouvelle notification FamilyGest',
      icon: data.icon || '/pwa-192x192.png',
      badge: data.badge || '/pwa-192x192.png',
      tag: data.tag || `familygest-${Date.now()}`,
      vibrate: [150, 80, 150],
      data: {
        url: data.url || '/',
        googleCalendarUrl: data.googleCalendarUrl || null
      },
      actions: data.actions || []
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('[SW Push] Erreur lors de la réception de la notification push:', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Si l'utilisateur a cliqué sur le bouton d'action Google Agenda
  if (event.action === 'add-google' && event.notification.data?.googleCalendarUrl) {
    event.waitUntil(clients.openWindow(event.notification.data.googleCalendarUrl));
    return;
  }

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client && targetUrl !== '/') {
            return client.navigate(targetUrl);
          }
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});


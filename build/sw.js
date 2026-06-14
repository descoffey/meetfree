// Service worker — no caching, always fetch fresh
// Push notifications only

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Always go to network — no caching
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});

// Push notifications
self.addEventListener("push", (event) => {
  let data = { title: "MeetFree", body: "You have a new notification 🌱" };
  try { data = event.data.json(); } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(data.title || "MeetFree", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-96.png",
      data: { url: data.url || "/" },
      vibrate: [200, 100, 200],
    })
  );
});

// Notification click — open the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes("meetfree.uk") && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

const MEDIA_CACHE = "photo-drive-media-v1";

function isMediaAssetUrl(url) {
  return /\/media\/[^?]+\.(webp|jpe?g|png|gif)(\?|$)/i.test(url.pathname);
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = { title: "Photo Drive", body: "", url: "/", icon: "" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* ignore */
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Photo Drive", {
      body: data.body || "",
      icon: data.icon || undefined,
      badge: data.icon || undefined,
      data: { url: data.url || "/" },
      tag: "photo-drive-upload",
      renotify: true,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = event.notification.data?.url || "/";
  const targetUrl = new URL(path, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (!isMediaAssetUrl(url)) return;

  event.respondWith(
    caches.open(MEDIA_CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;

      const response = await fetch(event.request);
      if (response.ok) {
        void cache.put(event.request, response.clone());
      }
      return response;
    })
  );
});

const MEDIA_CACHE = "photo-drive-media-v1";

function isMediaAssetUrl(url) {
  return /\/media\/[^?]+\.(webp|jpe?g|png|gif)(\?|$)/i.test(url.pathname);
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function toAbsoluteUrl(path) {
  if (!path) return self.location.origin + "/";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return new URL(path, self.location.origin).href;
}

self.addEventListener("push", (event) => {
  let data = { title: "업로드 완료", body: "", url: "/", icon: "" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* ignore */
  }

  const targetUrl = toAbsoluteUrl(data.url);
  const iconUrl = data.icon ? toAbsoluteUrl(data.icon) : undefined;

  event.waitUntil(
    self.registration.showNotification(data.title || "업로드 완료", {
      body: data.body || "",
      icon: iconUrl,
      badge: iconUrl,
      data: { url: targetUrl },
      tag: "photo-drive-upload",
      renotify: true,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = toAbsoluteUrl(event.notification.data?.url || "/");

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
      if (cached?.ok) return cached;

      const response = await fetch(event.request, { credentials: "include" });
      if (response.ok) {
        void cache.put(event.request, response.clone());
      }
      return response;
    })
  );
});

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

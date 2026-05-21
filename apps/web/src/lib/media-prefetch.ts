import type { MediaDetailData } from "@/components/media/media-detail";

const detailCache = new Map<string, MediaDetailData>();
const loadedOriginalUrls = new Set<string>();
const inflight = new Map<string, Promise<MediaDetailData | null>>();

function preloadImage(url: string): Promise<void> {
  if (loadedOriginalUrls.has(url)) return Promise.resolve();
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      loadedOriginalUrls.add(url);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = url;
  });
}

function preloadVideo(url: string): void {
  if (loadedOriginalUrls.has(url)) return;
  const link = document.createElement("link");
  link.rel = "prefetch";
  link.as = "video";
  link.href = url;
  document.head.appendChild(link);
  loadedOriginalUrls.add(url);
}

async function preloadOriginalAsset(data: MediaDetailData): Promise<void> {
  if (data.type === "image") {
    const url = data.originalUrl ?? data.previewUrl;
    if (url) await preloadImage(url);
    return;
  }

  if (data.type === "video" && data.videoPreviewUrl) {
    preloadVideo(data.videoPreviewUrl);
  }
}

export function isOriginalUrlCached(url: string | undefined): boolean {
  return !!url && loadedOriginalUrls.has(url);
}

export function getPrefetchedMedia(id: string): MediaDetailData | undefined {
  return detailCache.get(id);
}

export async function prefetchMediaDetail(
  id: string,
  base: string
): Promise<MediaDetailData | null> {
  const cached = detailCache.get(id);
  if (cached) {
    void preloadOriginalAsset(cached);
    return cached;
  }

  const existing = inflight.get(id);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const res = await fetch(`${base}/api/media/${id}`);
      if (!res.ok) return null;
      const data = (await res.json()) as MediaDetailData;
      detailCache.set(id, data);
      await preloadOriginalAsset(data);
      return data;
    } catch {
      return null;
    } finally {
      inflight.delete(id);
    }
  })();

  inflight.set(id, promise);
  return promise;
}

export function prefetchAdjacentMedia(
  ids: (string | undefined)[],
  base: string
): void {
  for (const id of ids) {
    if (id) void prefetchMediaDetail(id, base);
  }
}

export function invalidatePrefetchedMedia(id: string): void {
  detailCache.delete(id);
  inflight.delete(id);
}

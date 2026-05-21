/** 세션 동안 thumb/poster 등 그리드용 이미지 URL → blob URL 캐시 */

const MAX_ENTRIES = 500;

const blobUrlBySrc = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

function evictOldest(): void {
  if (blobUrlBySrc.size <= MAX_ENTRIES) return;
  const oldest = blobUrlBySrc.keys().next().value;
  if (!oldest) return;
  const blobUrl = blobUrlBySrc.get(oldest);
  if (blobUrl) URL.revokeObjectURL(blobUrl);
  blobUrlBySrc.delete(oldest);
}

export function hasCachedMediaImage(src: string | undefined): boolean {
  return !!src && blobUrlBySrc.has(src);
}

export function getCachedMediaImageUrl(src: string | undefined): string | undefined {
  if (!src) return undefined;
  return blobUrlBySrc.get(src);
}

export function resolveMediaImage(src: string): Promise<string> {
  const cached = blobUrlBySrc.get(src);
  if (cached) return Promise.resolve(cached);

  const pending = inflight.get(src);
  if (pending) return pending;

  const promise = fetch(src, { cache: "force-cache" })
    .then((res) => {
      if (!res.ok) throw new Error(`image fetch failed: ${res.status}`);
      return res.blob();
    })
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      blobUrlBySrc.set(src, blobUrl);
      evictOldest();
      return blobUrl;
    })
    .finally(() => {
      inflight.delete(src);
    });

  inflight.set(src, promise);
  return promise;
}

export function prefetchMediaImages(urls: (string | undefined)[]): void {
  for (const url of urls) {
    if (url && !blobUrlBySrc.has(url) && !inflight.has(url)) {
      void resolveMediaImage(url).catch(() => {});
    }
  }
}

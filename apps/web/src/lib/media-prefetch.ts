import type { MediaDetailData } from "@/components/media/media-detail";

const detailCache = new Map<string, MediaDetailData>();
const loadedPreviewUrls = new Set<string>();
const loadedOriginalUrls = new Set<string>();
const inflight = new Map<string, Promise<MediaDetailData | null>>();

/** 다운로드 + 디코드 완료까지 (화면에 progressive로 그려지는 것 방지) */
export function loadDecodedImage(url: string): Promise<void> {
  if (loadedOriginalUrls.has(url)) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const finish = () => {
        loadedOriginalUrls.add(url);
        resolve();
      };
      if (typeof img.decode === "function") {
        img.decode().then(finish).catch(finish);
      } else {
        finish();
      }
    };
    img.onerror = () => reject(new Error("image load failed"));
    img.src = url;
  });
}

function preloadImage(url: string, loadedSet: Set<string>): Promise<void> {
  if (loadedSet.has(url)) return Promise.resolve();
  return loadDecodedImage(url)
    .then(() => {
      loadedSet.add(url);
    })
    .catch(() => {
      /* prefetch 실패는 무시 */
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

/** 미리보기(medium) — 상세 화면 즉시 표시용 */
async function preloadPreviewAsset(data: MediaDetailData): Promise<void> {
  if (data.type !== "image") return;
  const url = data.previewUrl ?? data.thumbnailUrl;
  if (url) await preloadImage(url, loadedPreviewUrls);
}

/** 원본 — 백그라운드만, 열기/스와이프를 막지 않음 */
export function preloadOriginalInBackground(data: MediaDetailData): void {
  void (async () => {
    if (data.type === "image") {
      if (data.originalUrl) {
        await preloadImage(data.originalUrl, loadedOriginalUrls);
      }
      return;
    }

    if (data.videoPreviewUrl) {
      preloadVideo(data.videoPreviewUrl);
    }
  })();
}

export function isOriginalUrlCached(url: string | undefined): boolean {
  return !!url && loadedOriginalUrls.has(url);
}

export function getPrefetchedMedia(id: string): MediaDetailData | undefined {
  return detailCache.get(id);
}

/** 현재 인덱스 기준 ±radius 이웃 mediaId (현재 제외) */
export function collectNeighborIds(
  items: { id: string }[],
  index: number,
  radius = 2
): string[] {
  if (index < 0 || index >= items.length) return [];
  const ids: string[] = [];
  for (let offset = -radius; offset <= radius; offset++) {
    if (offset === 0) continue;
    const item = items[index + offset];
    if (item?.id) ids.push(item.id);
  }
  return ids;
}

export async function prefetchMediaDetail(
  id: string,
  base: string
): Promise<MediaDetailData | null> {
  const cached = detailCache.get(id);
  if (cached) {
    void preloadPreviewAsset(cached);
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
      await preloadPreviewAsset(data);
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

function isImageOriginalFullyCached(data: MediaDetailData): boolean {
  if (data.type !== "image" || !data.originalUrl) return true;
  const preview = data.previewUrl ?? data.thumbnailUrl;
  if (data.originalUrl === preview) return true;
  return loadedOriginalUrls.has(data.originalUrl);
}

/** 이전/다음 항목: 메타 + 미리보기 + 원본(이미지) 백그라운드 */
export function prefetchAdjacentMedia(
  ids: (string | undefined)[],
  base: string
): void {
  for (const id of ids) {
    if (!id) continue;

    const cached = detailCache.get(id);
    if (cached && isImageOriginalFullyCached(cached)) continue;

    void prefetchMediaDetail(id, base).then((data) => {
      if (!data || isImageOriginalFullyCached(data)) return;
      preloadOriginalInBackground(data);
    });
  }
}

/** 이웃 ID에 대해 원본만 prefetch (detailCache 활용) */
export function prefetchNeighborOriginals(
  ids: string[],
  base: string
): void {
  for (const id of ids) {
    const cached = detailCache.get(id);
    if (cached) {
      if (!isImageOriginalFullyCached(cached)) {
        preloadOriginalInBackground(cached);
      }
      continue;
    }

    void prefetchMediaDetail(id, base).then((data) => {
      if (data && !isImageOriginalFullyCached(data)) {
        preloadOriginalInBackground(data);
      }
    });
  }
}

export function invalidatePrefetchedMedia(id: string): void {
  detailCache.delete(id);
  inflight.delete(id);
}

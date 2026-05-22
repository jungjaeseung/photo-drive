export const ZIP_CHUNK_SIZE = 100;

export type DownloadPhase = "compressing" | "downloading";

export type DownloadProgress = {
  phase: DownloadPhase;
  loaded: number;
  total: number | null;
  percent: number | null;
  /** 1-based, 여러 ZIP일 때 */
  part?: number;
  totalParts?: number;
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function parseTotalBytes(res: Response): number | null {
  const contentLength = res.headers.get("Content-Length");
  if (contentLength) {
    const n = parseInt(contentLength, 10);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  const sourceBytes = res.headers.get("X-Source-Bytes");
  if (sourceBytes) {
    const n = parseInt(sourceBytes, 10);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return null;
}

function buildPartProgress(
  part: number,
  totalParts: number,
  phase: DownloadPhase,
  loaded: number,
  total: number | null
): DownloadProgress {
  const partWeight = 1 / totalParts;
  const partBase = (part - 1) * partWeight;
  let fraction = 0;
  if (phase === "downloading" && total && total > 0) {
    fraction = Math.min(0.99, loaded / total) * partWeight;
  } else if (phase === "compressing") {
    fraction = 0.03 * partWeight;
  }
  const percent = Math.min(99, Math.round((partBase + fraction) * 100));
  return { phase, loaded, total, percent, part, totalParts };
}

function parseContentDispositionFilename(
  header: string | null
): string | null {
  if (!header) return null;
  const star = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (star) {
    try {
      return decodeURIComponent(star[1].trim());
    } catch {
      /* fall through */
    }
  }
  const plain = header.match(/filename="([^"]+)"/i);
  return plain?.[1] ?? null;
}

function sanitizeFilenameBase(name: string): string {
  return (
    name
      .trim()
      .replace(/[/\\?%*:|"<>]/g, "_")
      .replace(/\s+/g, " ")
      .slice(0, 100) || "download"
  );
}

function zipFilename(base: string, part: number, totalParts: number): string {
  const safe = sanitizeFilenameBase(base);
  if (totalParts <= 1) return `${safe}.zip`;
  return `${safe}-${part}.zip`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadOneZip(
  mediaIds: string[],
  filename: string,
  onProgress?: (p: DownloadProgress) => void,
  partMeta?: { part: number; totalParts: number }
): Promise<void> {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const res = await fetch(`${base}/api/media/download-zip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mediaIds }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "다운로드 실패");
  }

  const total = parseTotalBytes(res);
  const part = partMeta?.part ?? 1;
  const totalParts = partMeta?.totalParts ?? 1;

  onProgress?.(
    buildPartProgress(part, totalParts, "compressing", 0, total)
  );

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("다운로드 스트림을 읽을 수 없습니다");
  }

  const chunks: Uint8Array[] = [];
  let loaded = 0;
  let phase: DownloadPhase = "compressing";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value.byteLength > 0) {
      if (phase === "compressing") phase = "downloading";
      loaded += value.byteLength;
      chunks.push(value);
      onProgress?.(
        buildPartProgress(part, totalParts, phase, loaded, total)
      );
    }
  }

  onProgress?.(
    buildPartProgress(part, totalParts, "downloading", loaded, total)
  );

  const blob = new Blob(chunks as BlobPart[], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    parseContentDispositionFilename(res.headers.get("Content-Disposition")) ??
    filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export type DownloadZipOptions = {
  /** 단일 ZIP일 때 파일명 베이스 (확장자 제외) */
  filenameBase?: string;
};

/** 미디어 ID 목록을 100장 단위 ZIP으로 순차 다운로드 */
export async function downloadMediaAsZip(
  mediaIds: string[],
  onProgress?: (p: DownloadProgress) => void,
  options?: DownloadZipOptions
): Promise<void> {
  const unique = [...new Set(mediaIds.filter(Boolean))];
  if (unique.length === 0) {
    throw new Error("다운로드할 항목이 없습니다");
  }

  const batches = chunkArray(unique, ZIP_CHUNK_SIZE);
  const totalParts = batches.length;
  const date = new Date().toISOString().slice(0, 10);
  const baseName = options?.filenameBase ?? `photo-drive-${date}`;

  for (let i = 0; i < batches.length; i++) {
    const part = i + 1;
    await downloadOneZip(
      batches[i],
      zipFilename(baseName, part, totalParts),
      onProgress,
      { part, totalParts }
    );
    if (i < batches.length - 1) {
      await delay(400);
    }
  }

  if (totalParts > 0) {
    onProgress?.({
      phase: "downloading",
      loaded: 0,
      total: null,
      percent: 100,
      part: totalParts,
      totalParts,
    });
  }
}

export async function downloadAlbumAsZip(
  albumId: string,
  albumName: string,
  onProgress?: (p: DownloadProgress) => void
): Promise<void> {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const res = await fetch(`${base}/api/albums/${albumId}/media-ids`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "앨범 목록 조회 실패");
  }

  const data = (await res.json()) as { mediaIds?: string[] };
  const mediaIds = data.mediaIds ?? [];
  if (mediaIds.length === 0) {
    throw new Error("앨범에 다운로드할 항목이 없습니다");
  }

  await downloadMediaAsZip(mediaIds, onProgress, {
    filenameBase: albumName,
  });
}

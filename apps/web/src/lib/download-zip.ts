export type DownloadPhase = "compressing" | "downloading";

export type DownloadProgress = {
  phase: DownloadPhase;
  loaded: number;
  total: number | null;
  percent: number | null;
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
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

function buildProgress(
  phase: DownloadPhase,
  loaded: number,
  total: number | null
): DownloadProgress {
  const percent =
    phase === "downloading" && total
      ? Math.min(99, Math.round((loaded / total) * 100))
      : null;
  return { phase, loaded, total, percent };
}

export async function downloadMediaAsZip(
  mediaIds: string[],
  onProgress?: (p: DownloadProgress) => void
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
  onProgress?.(buildProgress("compressing", 0, total));

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
      if (phase === "compressing") {
        phase = "downloading";
      }
      loaded += value.byteLength;
      chunks.push(value);
      onProgress?.(buildProgress(phase, loaded, total));
    }
  }

  onProgress?.({
    phase: "downloading",
    loaded,
    total,
    percent: 100,
  });

  const blob = new Blob(chunks as BlobPart[], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `photo-drive-${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

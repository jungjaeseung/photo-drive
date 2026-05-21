/** Parse EXIF, ffprobe, or ISO date strings into ISO timestamps. */
export function parseMediaDate(value: unknown): string | undefined {
  if (value == null) return undefined;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }

  const raw = String(value).trim();
  if (!raw) return undefined;

  // EXIF "YYYY:MM:DD HH:mm:ss"
  const exifMatch = raw.match(
    /^(\d{4}):(\d{2}):(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2}))?/
  );
  if (exifMatch) {
    const [, y, mo, d, h = "0", mi = "0", s = "0"] = exifMatch;
    const parsed = new Date(
      `${y}-${mo}-${d}T${h}:${mi}:${s}`
    );
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** Pick the first valid date in priority order (preferred over earliest). */
export function pickTakenAtInOrder(
  candidates: unknown[],
  options?: { notAfter?: Date }
): string | undefined {
  const ceiling = options?.notAfter ?? new Date();
  const ceilingMs = ceiling.getTime();

  for (const candidate of candidates) {
    const iso = parseMediaDate(candidate);
    if (!iso) continue;
    const ms = new Date(iso).getTime();
    if (!Number.isNaN(ms) && ms <= ceilingMs) return iso;
  }
  return undefined;
}

/** @deprecated Use pickTakenAtInOrder for capture times. */
export function pickTakenAt(
  candidates: unknown[],
  options?: { notAfter?: Date }
): string | undefined {
  return pickTakenAtInOrder(candidates, options);
}

const MIN_CAPTURE_MS = new Date("1980-01-01T00:00:00.000Z").getTime();

/** 업로드 시각보다 너무 오래된 takenAt = 임베딩 EXIF(다운로드·재저장)로 간주 */
const STALE_EXIF_GAP_MS = 7 * 24 * 60 * 60 * 1000;

/** 촬영 시각으로 쓸 수 있는지 (빈 값·1970년대 등 제외) */
export function isPlausibleCaptureDate(iso: string): boolean {
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < MIN_CAPTURE_MS) return false;
  return ms <= Date.now() + 86_400_000;
}

/**
 * 그리드·ES 정렬용 통합 시각 (타입·필드별로 나뉘지 않게 한 축으로)
 * - takenAt이 업로드보다 7일+ 이전이면 임베딩 EXIF로 보고 uploadedAt 사용
 * - 그 외 plausible takenAt → uploadedAt → createdAt
 */
export function computeSortAt(doc: {
  takenAt?: string | null;
  uploadedAt?: string | null;
  createdAt?: string | null;
  exif?: Record<string, unknown> | null;
}): string {
  const takenIso = doc.takenAt ? parseMediaDate(doc.takenAt) : undefined;
  const uploadedIso = doc.uploadedAt ? parseMediaDate(doc.uploadedAt) : undefined;

  if (
    takenIso &&
    uploadedIso &&
    isPlausibleCaptureDate(takenIso) &&
    isPlausibleCaptureDate(uploadedIso)
  ) {
    const gapMs =
      new Date(uploadedIso).getTime() - new Date(takenIso).getTime();
    if (gapMs > STALE_EXIF_GAP_MS) {
      const fileIso = pickTakenAtInOrder(
        [doc.exif?.FileModifyDate, doc.exif?.FileCreateDate],
        { notAfter: new Date(uploadedIso) }
      );
      if (fileIso && isPlausibleCaptureDate(fileIso)) return fileIso;
      return uploadedIso;
    }
    return takenIso;
  }

  if (takenIso && isPlausibleCaptureDate(takenIso)) return takenIso;
  if (uploadedIso) return uploadedIso;
  if (doc.createdAt) {
    const iso = parseMediaDate(doc.createdAt);
    if (iso) return iso;
  }
  return new Date(0).toISOString();
}

/** 그리드 표시·클라이언트 정렬 (항상 최신 규칙으로 재계산) */
export function getEffectiveSortIso(doc: {
  sortAt?: string | null;
  takenAt?: string | null;
  uploadedAt?: string | null;
  createdAt?: string | null;
  exif?: Record<string, unknown> | null;
}): string {
  return computeSortAt(doc);
}

export function getEffectiveSortMillis(doc: {
  sortAt?: string | null;
  takenAt?: string | null;
  uploadedAt?: string | null;
  createdAt?: string | null;
  exif?: Record<string, unknown> | null;
}): number {
  return new Date(getEffectiveSortIso(doc)).getTime();
}

/** Client File.lastModified → initial takenAt before worker metadata pass. */
export function takenAtFromFileLastModified(
  lastModifiedMs: number,
  uploadedAt: Date = new Date()
): string {
  if (!Number.isFinite(lastModifiedMs) || lastModifiedMs <= 0) {
    return uploadedAt.toISOString();
  }
  const picked = pickTakenAtInOrder([lastModifiedMs], { notAfter: uploadedAt });
  return picked ?? uploadedAt.toISOString();
}

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

  // EXIF "YYYY:MM:DD HH:mm:ss" — 타임존 없음, 한국 현지 시각으로 해석
  const exifMatch = raw.match(
    /^(\d{4}):(\d{2}):(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2}))?/
  );
  if (exifMatch) {
    return kstLocalPartsToUtcIso(exifMatch);
  }

  // "YYYY-MM-DDTHH:mm:ss" without Z/offset — 현지(KST) 시각
  const naiveIso = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/
  );
  if (naiveIso && !raw.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(raw)) {
    return kstLocalPartsToUtcIso(naiveIso);
  }

  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** 한국 현지 시각(타임존 없음) → UTC ISO */
function kstLocalPartsToUtcIso(
  m: RegExpMatchArray
): string | undefined {
  const [, y, mo, d, h = "0", mi = "0", s = "0"] = m;
  const utcMs =
    Date.UTC(+y, +mo - 1, +d, +h, +mi, +s) - KST_OFFSET_MS;
  const parsed = new Date(utcMs);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
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

/** 한국 표준시 (DST 없음) */
export const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 촬영 시각으로 쓸 수 있는지 (빈 값·1970년대 등 제외) */
export function isPlausibleCaptureDate(iso: string): boolean {
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < MIN_CAPTURE_MS) return false;
  return ms <= Date.now() + 86_400_000;
}

/**
 * 그리드·ES 정렬용 통합 시각: plausible takenAt → uploadedAt → createdAt
 * (worker가 넣은 takenAt 그대로 — 업로드일로 덮어쓰지 않음)
 */
export function computeSortAt(doc: {
  type?: string;
  takenAt?: string | null;
  uploadedAt?: string | null;
  createdAt?: string | null;
  exif?: Record<string, unknown> | null;
}): string {
  if (doc.takenAt) {
    const iso = parseMediaDate(doc.takenAt);
    if (iso && isPlausibleCaptureDate(iso)) return iso;
  }
  if (doc.uploadedAt) {
    const iso = parseMediaDate(doc.uploadedAt);
    if (iso) return iso;
  }
  if (doc.createdAt) {
    const iso = parseMediaDate(doc.createdAt);
    if (iso) return iso;
  }
  return new Date(0).toISOString();
}

/**
 * 화면 정렬·날짜 구간 — 항상 takenAt 기준 재계산
 * (ES sortAt는 백필/색인용, 잘못 백필된 값이 UI에 남지 않게 함)
 */
export function getEffectiveSortIso(doc: {
  type?: string;
  sortAt?: string | null;
  takenAt?: string | null;
  uploadedAt?: string | null;
  createdAt?: string | null;
  exif?: Record<string, unknown> | null;
}): string {
  return computeSortAt(doc);
}

export function getEffectiveSortMillis(doc: {
  type?: string;
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

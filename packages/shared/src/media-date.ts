/** Parse EXIF, ffprobe reference strings (debug / worker reference only). */
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

  const exifMatch = raw.match(
    /^(\d{4}):(\d{2}):(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2}))?/
  );
  if (exifMatch) {
    return kstLocalPartsToUtcIso(exifMatch);
  }

  const naiveIso = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/
  );
  if (naiveIso && !raw.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(raw)) {
    return kstLocalPartsToUtcIso(naiveIso);
  }

  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** 저장된 UTC ISO 필드 파싱 (takenAt / sortAt / uploadedAt) */
export function parseUtcIso(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
  }
  return undefined;
}

/** 한국 현지 시각(타임존 없음) → UTC ISO — EXIF 참고용 */
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
    const iso =
      typeof candidate === "number"
        ? parseUtcIso(new Date(candidate))
        : parseMediaDate(candidate);
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
const KST_TIMEZONE = "Asia/Seoul";

/** 한국 표준시 (DST 없음) */
export const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 촬영 시각으로 쓸 수 있는지 (빈 값·1970년대 등 제외) */
export function isPlausibleCaptureDate(iso: string): boolean {
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < MIN_CAPTURE_MS) return false;
  return ms <= Date.now() + 86_400_000;
}

/**
 * ES sortAt / 업로드 시 설정: plausible takenAt → uploadedAt → createdAt
 * (takenAt은 file.lastModified UTC — EXIF 변환 없음)
 */
export function computeSortAt(doc: {
  takenAt?: string | null;
  uploadedAt?: string | null;
  createdAt?: string | null;
}): string {
  if (doc.takenAt) {
    const iso = parseUtcIso(doc.takenAt);
    if (iso && isPlausibleCaptureDate(iso)) return iso;
  }
  if (doc.uploadedAt) {
    const iso = parseUtcIso(doc.uploadedAt);
    if (iso) return iso;
  }
  if (doc.createdAt) {
    const iso = parseUtcIso(doc.createdAt);
    if (iso) return iso;
  }
  return new Date(0).toISOString();
}

/** ES·클라이언트 정렬용 UTC ISO (저장값 우선, 재계산 없음) */
export function getSortIso(doc: {
  sortAt?: string | null;
  takenAt?: string | null;
  uploadedAt?: string | null;
  createdAt?: string | null;
}): string {
  const sortAt = doc.sortAt ? parseUtcIso(doc.sortAt) : undefined;
  if (sortAt && isPlausibleCaptureDate(sortAt)) return sortAt;
  const takenAt = doc.takenAt ? parseUtcIso(doc.takenAt) : undefined;
  if (takenAt && isPlausibleCaptureDate(takenAt)) return takenAt;
  return computeSortAt(doc);
}

export function getSortMillis(doc: {
  sortAt?: string | null;
  takenAt?: string | null;
  uploadedAt?: string | null;
  createdAt?: string | null;
}): number {
  return new Date(getSortIso(doc)).getTime();
}

/** KST 기준 yyyy-MM-dd (그리드 날짜 구간·필터용) */
export function getKstDateKey(iso: string): string {
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "1970-01-01";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: KST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

/** yyyy-MM-dd → yyyy년 M월 d일 */
export function formatKstDateLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  return `${y}년 ${m}월 ${d}일`;
}

/** UTC ISO → KST 표시 문자열 */
export function formatKstDateTime(iso: string): string {
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return iso;
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: KST_TIMEZONE,
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(ms));
}

/** @deprecated Use getSortIso */
export function getEffectiveSortIso(doc: {
  sortAt?: string | null;
  takenAt?: string | null;
  uploadedAt?: string | null;
  createdAt?: string | null;
}): string {
  return getSortIso(doc);
}

/** @deprecated Use getSortMillis */
export function getEffectiveSortMillis(doc: {
  sortAt?: string | null;
  takenAt?: string | null;
  uploadedAt?: string | null;
  createdAt?: string | null;
}): number {
  return getSortMillis(doc);
}

/** Client File.lastModified → upload takenAt (UTC ISO) */
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

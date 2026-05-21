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

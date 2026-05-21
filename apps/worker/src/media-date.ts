import { pickTakenAtInOrder } from "@photo-drive/shared";

const IMAGE_EXIF_DATE_KEYS = [
  "DateTimeOriginal",
  "DateTimeDigitized",
  "CreateDate",
  "MetadataDate",
  "DateCreated",
  "ModifyDate",
  "DateTime",
  "FileModifyDate",
  "FileCreateDate",
  "SubSecDateTimeOriginal",
  "SubSecCreateDate",
  "SubSecDateTimeDigitized",
] as const;

export function takenAtFromExif(
  exif: Record<string, unknown> | null | undefined,
  fallback: string,
  notAfter: Date
): string {
  if (!exif) return fallback;

  const candidates: unknown[] = [];
  const seen = new Set<unknown>();

  function add(value: unknown) {
    if (value == null || seen.has(value)) return;
    seen.add(value);
    candidates.push(value);
  }

  for (const key of IMAGE_EXIF_DATE_KEYS) {
    add(exif[key]);
  }

  for (const [key, value] of Object.entries(exif)) {
    if (/date|time|created|modified|digitized/i.test(key)) {
      add(value);
    }
  }

  return pickTakenAtInOrder([...candidates, fallback], { notAfter }) ?? fallback;
}

interface FfprobeTags {
  creation_time?: string;
  date?: string;
  "com.apple.quicktime.creationdate"?: string;
  [key: string]: string | undefined;
}

export function takenAtFromFfprobe(
  probe: {
    format?: { tags?: FfprobeTags };
    streams?: { tags?: FfprobeTags }[];
  },
  fallback: string,
  notAfter: Date
): string {
  const formatTags = probe.format?.tags ?? {};
  const streamDates: unknown[] = [];
  for (const stream of probe.streams ?? []) {
    if (stream.tags?.creation_time) streamDates.push(stream.tags.creation_time);
    if (stream.tags?.date) streamDates.push(stream.tags.date);
  }

  const candidates: unknown[] = [
    formatTags.creation_time,
    formatTags["com.apple.quicktime.creationdate"],
    formatTags["com.apple.quicktime.make"],
    formatTags.date,
    formatTags["DATE"],
    ...streamDates,
  ];

  for (const [key, value] of Object.entries(formatTags)) {
    if (/date|time|created/i.test(key) && value) {
      candidates.push(value);
    }
  }
  for (const stream of probe.streams ?? []) {
    for (const [key, value] of Object.entries(stream.tags ?? {})) {
      if (/date|time|created/i.test(key) && value) {
        candidates.push(value);
      }
    }
  }

  candidates.push(fallback);

  return pickTakenAtInOrder(candidates, { notAfter }) ?? fallback;
}

import { pickTakenAtInOrder } from "@photo-drive/shared";

const IMAGE_EXIF_DATE_KEYS = [
  "DateTimeOriginal",
  "DateTimeDigitized",
  "CreateDate",
  "MetadataDate",
  "DateCreated",
  "ModifyDate",
] as const;

export function takenAtFromExif(
  exif: Record<string, unknown> | null | undefined,
  fallback: string,
  notAfter: Date
): string {
  if (!exif) return fallback;

  const candidates: unknown[] = [];
  for (const key of IMAGE_EXIF_DATE_KEYS) {
    if (exif[key] != null) candidates.push(exif[key]);
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
    formatTags.date,
    ...streamDates,
    fallback,
  ];

  return pickTakenAtInOrder(candidates, { notAfter }) ?? fallback;
}

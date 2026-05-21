import path from "node:path";

export function formatDateParts(date: Date): { year: string; month: string; day: string } {
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return { year, month, day };
}

export function getMediaDir(
  storageRoot: string,
  uploadedAt: Date,
  mediaId: string
): string {
  const { year, month, day } = formatDateParts(uploadedAt);
  return path.join(storageRoot, "media", year, month, day, mediaId);
}

export function getRelativeMediaPath(
  uploadedAt: Date,
  mediaId: string,
  filename: string
): string {
  const { year, month, day } = formatDateParts(uploadedAt);
  return path.posix.join("media", year, month, day, mediaId, filename);
}

export function mediaUrl(basePath: string, relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/");
  return `${basePath}/${normalized}`;
}

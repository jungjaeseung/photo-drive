import type { MediaGridItem } from "@/components/media/media-grid";

export function buildProcessingGridItem(
  file: File,
  mediaId: string
): MediaGridItem {
  const now = new Date().toISOString();
  const takenAt =
    file.lastModified > 0
      ? new Date(file.lastModified).toISOString()
      : now;

  return {
    id: mediaId,
    type: file.type.startsWith("video/") ? "video" : "image",
    status: "processing",
    uploadedAt: now,
    takenAt,
  };
}

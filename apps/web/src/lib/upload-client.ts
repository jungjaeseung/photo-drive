import type { MediaGridItem } from "@/components/media/media-grid";
import { takenAtFromFileLastModified } from "@photo-drive/shared/media-date";

export function buildProcessingGridItem(
  file: File,
  mediaId: string
): MediaGridItem {
  const now = new Date();
  const uploadedAt = now.toISOString();
  const takenAt = takenAtFromFileLastModified(
    file.lastModified > 0 ? file.lastModified : 0,
    now
  );

  return {
    id: mediaId,
    type: file.type.startsWith("video/") ? "video" : "image",
    status: "processing",
    uploadedAt,
    takenAt,
  };
}

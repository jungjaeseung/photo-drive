import { mediaUrl } from "@photo-drive/shared";
import { getBasePath } from "./config";

export function toMediaPublicUrl(relativePath?: string): string | undefined {
  if (!relativePath) return undefined;
  return mediaUrl(getBasePath(), relativePath);
}

export function getMediaAssetUrl(
  doc: {
    thumbnailPath?: string;
    previewPath?: string;
    originalPath?: string;
    status: string;
  },
  variant: "thumb" | "medium" | "original" | "poster" | "preview"
): string | undefined {
  switch (variant) {
    case "thumb":
      return toMediaPublicUrl(doc.thumbnailPath);
    case "medium":
      return toMediaPublicUrl(doc.previewPath);
    case "poster":
      return toMediaPublicUrl(doc.thumbnailPath);
    case "preview":
      return toMediaPublicUrl(doc.previewPath);
    case "original":
      return toMediaPublicUrl(doc.originalPath);
    default:
      return undefined;
  }
}

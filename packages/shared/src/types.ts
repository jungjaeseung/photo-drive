export type MediaType = "image" | "video";
export type MediaStatus = "processing" | "ready" | "failed" | "deleting";

export interface MediaDocument {
  id: string;
  type: MediaType;
  status: MediaStatus;
  originalPath: string;
  thumbnailPath?: string;
  previewPath?: string;
  filename: string;
  mimeType: string;
  extension: string;
  width?: number;
  height?: number;
  duration?: number;
  size: number;
  sha256: string;
  createdAt: string;
  takenAt: string;
  uploadedAt: string;
  albumIds: string[];
  favorite: boolean;
  exif?: Record<string, unknown>;
  deletedAt?: string;
  codec?: string;
  resolution?: string;
  errorMessage?: string;
}

export interface AlbumDocument {
  id: string;
  name: string;
  description?: string;
  coverMediaId?: string;
  mediaCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MediaListResponse {
  items: MediaDocument[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface DuplicateUploadError {
  error: "duplicate";
  existingMediaId: string;
  message: string;
}

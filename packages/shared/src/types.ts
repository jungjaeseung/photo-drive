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
  /** 그리드·ES 정렬용 통합 시각 (촬영/캡처/업로드 fallback 반영) */
  sortAt?: string;
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
  sortOrder?: number;
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

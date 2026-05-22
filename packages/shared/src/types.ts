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
  /** 그리드·ES 정렬용 UTC 시각 (보통 takenAt과 동일) */
  sortAt?: string;
  /** KST 기준 yyyy-MM-dd — 일별 필터용 */
  takenAtDateKst?: string;
  uploadedAt: string;
  albumIds: string[];
  favorite: boolean;
  exif?: Record<string, unknown>;
  deletedAt?: string;
  codec?: string;
  resolution?: string;
  errorMessage?: string;
  /** 클라이언트 업로드 배치 — 푸시 알림 1회 묶음용 */
  uploadBatchId?: string;
}

export interface UserDocument {
  id: string;
  passwordHash: string;
  name: string;
  createdAt: string;
  updatedAt: string;
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

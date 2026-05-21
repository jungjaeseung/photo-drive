import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  getMediaDir,
  getRelativeMediaPath,
  IMAGE_MIME_PREFIX,
  VIDEO_MIME_PREFIX,
  computeSortAt,
  takenAtFromFileLastModified,
  type MediaDocument,
  type MediaType,
} from "@photo-drive/shared";
import { getStorageRoot } from "./config";

export function computeSha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function detectMediaType(mimeType: string): MediaType | null {
  if (mimeType.startsWith(IMAGE_MIME_PREFIX)) return "image";
  if (mimeType.startsWith(VIDEO_MIME_PREFIX)) return "video";
  return null;
}

export async function saveOriginalFile(params: {
  buffer: Buffer;
  mediaId: string;
  uploadedAt: Date;
  extension: string;
}): Promise<{ dir: string; originalPath: string; relativeOriginalPath: string }> {
  const storageRoot = getStorageRoot();
  const dir = getMediaDir(storageRoot, params.uploadedAt, params.mediaId);
  await mkdir(dir, { recursive: true });

  const filename = `original.${params.extension}`;
  const fullPath = path.join(dir, filename);
  await writeFile(fullPath, params.buffer);

  const relativeOriginalPath = getRelativeMediaPath(
    params.uploadedAt,
    params.mediaId,
    filename
  );

  return { dir, originalPath: fullPath, relativeOriginalPath };
}

export function buildInitialMediaDoc(params: {
  id: string;
  type: MediaType;
  filename: string;
  mimeType: string;
  extension: string;
  size: number;
  sha256: string;
  relativeOriginalPath: string;
  uploadedAt: Date;
  fileLastModified?: number;
}): MediaDocument {
  const now = params.uploadedAt.toISOString();
  const takenAt = takenAtFromFileLastModified(
    params.fileLastModified ?? 0,
    params.uploadedAt
  );
  const sortAt = computeSortAt({
    takenAt,
    uploadedAt: now,
    createdAt: now,
  });
  return {
    id: params.id,
    type: params.type,
    status: "processing",
    originalPath: params.relativeOriginalPath,
    filename: params.filename,
    mimeType: params.mimeType,
    extension: params.extension,
    size: params.size,
    sha256: params.sha256,
    createdAt: now,
    takenAt,
    sortAt,
    uploadedAt: now,
    albumIds: [],
    favorite: false,
  };
}

export function getExtension(filename: string, mimeType: string): string {
  const fromName = path.extname(filename).slice(1).toLowerCase();
  if (fromName) return fromName;
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/heic": "heic",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
  };
  return map[mimeType] ?? "bin";
}

import { writeFile } from "node:fs/promises";
import path from "node:path";
import {
  getMediaDir,
  getRelativeMediaPath,
  MEDIUM_MAX_SIZE,
  THUMB_MAX_SIZE,
  type MediaDocument,
} from "@photo-drive/shared";
import exifr from "exifr";
import sharp from "sharp";
import { getMediaById, updateMedia } from "./es.js";
import { getStorageRoot } from "./config.js";
import { scheduleUploadCompleteNotify } from "./push-notify.js";

export async function processImage(mediaId: string, storageRoot?: string): Promise<void> {
  const root = storageRoot ?? getStorageRoot();
  const doc = await getMediaById(mediaId);
  if (!doc || doc.type !== "image") {
    throw new Error(`Media ${mediaId} not found or not image`);
  }

  const uploadedAt = new Date(doc.uploadedAt);
  const dir = getMediaDir(root, uploadedAt, mediaId);
  const originalFull = path.join(root, doc.originalPath);

  try {
    const exif = (await exifr
      .parse(originalFull, {
        reviveValues: true,
        tiff: true,
        exif: true,
        xmp: true,
      })
      .catch(() => null)) as Record<string, unknown> | null;

    const image = sharp(originalFull).rotate();
    const metadata = await image.metadata();

    const thumbPath = path.join(dir, "thumb.webp");
    const mediumPath = path.join(dir, "medium.webp");

    await image
      .clone()
      .resize(THUMB_MAX_SIZE, THUMB_MAX_SIZE, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toFile(thumbPath);

    await image
      .clone()
      .resize(MEDIUM_MAX_SIZE, MEDIUM_MAX_SIZE, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toFile(mediumPath);

    const thumbRel = getRelativeMediaPath(uploadedAt, mediaId, "thumb.webp");
    const mediumRel = getRelativeMediaPath(uploadedAt, mediaId, "medium.webp");

    const snapshot: Partial<MediaDocument> = {
      status: "ready",
      thumbnailPath: thumbRel,
      previewPath: mediumRel,
      width: metadata.width,
      height: metadata.height,
      sortAt: doc.sortAt ?? doc.takenAt,
      exif: exif ? exif : undefined,
    };

    await writeFile(
      path.join(dir, "metadata.json"),
      JSON.stringify({ ...doc, ...snapshot }, null, 2)
    );

    await updateMedia(mediaId, snapshot);
    scheduleUploadCompleteNotify();
  } catch (error) {
    await updateMedia(mediaId, {
      status: "failed",
      errorMessage: String(error),
    });
    throw error;
  }
}

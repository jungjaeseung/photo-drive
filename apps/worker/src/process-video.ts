import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  getMediaDir,
  getRelativeMediaPath,
  VIDEO_PREVIEW_SECONDS,
} from "@photo-drive/shared";
import sharp from "sharp";
import { getMediaById, updateMedia } from "./es.js";
import { getStorageRoot } from "./config.js";
import { scheduleUploadCompleteNotify } from "./push-notify.js";

const execFileAsync = promisify(execFile);

interface FfprobeFormat {
  duration?: string;
  tags?: Record<string, string | undefined>;
}

interface FfprobeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  tags?: Record<string, string | undefined>;
}

async function ffprobe(filePath: string) {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "quiet",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    filePath,
  ]);
  return JSON.parse(stdout) as {
    format?: FfprobeFormat;
    streams?: FfprobeStream[];
  };
}

export async function processVideo(mediaId: string, storageRoot?: string): Promise<void> {
  const root = storageRoot ?? getStorageRoot();
  const doc = await getMediaById(mediaId);
  if (!doc || doc.type !== "video") {
    throw new Error(`Media ${mediaId} not found or not video`);
  }

  const uploadedAt = new Date(doc.uploadedAt);
  const dir = getMediaDir(root, uploadedAt, mediaId);
  const originalFull = path.join(root, doc.originalPath);

  try {
    const probe = await ffprobe(originalFull);
    const videoStream = probe.streams?.find((s) => s.codec_type === "video");
    const duration = probe.format?.duration
      ? parseFloat(probe.format.duration)
      : undefined;
    const width = videoStream?.width;
    const height = videoStream?.height;
    const codec = videoStream?.codec_name;
    const resolution = width && height ? `${width}x${height}` : undefined;

    const posterJpg = path.join(dir, "poster-temp.jpg");
    const posterPath = path.join(dir, "poster.webp");
    const previewPath = path.join(dir, "preview.mp4");

    await execFileAsync("ffmpeg", [
      "-y",
      "-i",
      originalFull,
      "-ss",
      "00:00:01",
      "-vframes",
      "1",
      "-q:v",
      "2",
      posterJpg,
    ]);

    await sharp(posterJpg)
      .resize(640, 640, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(posterPath);

    await unlink(posterJpg).catch(() => {});

    await execFileAsync("ffmpeg", [
      "-y",
      "-i",
      originalFull,
      "-t",
      String(VIDEO_PREVIEW_SECONDS),
      "-vf",
      "scale=1280:-2",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "28",
      "-c:a",
      "aac",
      "-b:a",
      "96k",
      previewPath,
    ]);

    const posterRel = getRelativeMediaPath(uploadedAt, mediaId, "poster.webp");
    const previewRel = getRelativeMediaPath(uploadedAt, mediaId, "preview.mp4");

    const snapshot = {
      status: "ready" as const,
      thumbnailPath: posterRel,
      previewPath: previewRel,
      duration,
      width,
      height,
      codec,
      resolution,
      sortAt: doc.sortAt ?? doc.takenAt,
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

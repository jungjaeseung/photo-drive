import { findMediaBySha256, indexMedia } from "@/lib/es";
import { enqueueMediaJob } from "@/lib/queue";
import { getStorageRoot } from "@/lib/config";
import {
  buildInitialMediaDoc,
  computeSha256,
  detectMediaType,
  getExtension,
  saveOriginalFile,
} from "@/lib/upload";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length === 0) {
      return NextResponse.json({ error: "empty file" }, { status: 400 });
    }

    const sha256 = computeSha256(buffer);
    const existing = await findMediaBySha256(sha256);
    if (existing) {
      return NextResponse.json(
        {
          error: "duplicate",
          existingMediaId: existing.id,
          message: "동일한 파일이 이미 존재합니다.",
        },
        { status: 409 }
      );
    }

    const mimeType = file.type || "application/octet-stream";
    const mediaType = detectMediaType(mimeType);
    if (!mediaType) {
      return NextResponse.json(
        { error: "unsupported media type" },
        { status: 400 }
      );
    }

    const mediaId = uuidv4();
    const uploadedAt = new Date();
    const extension = getExtension(file.name, mimeType);

    const { relativeOriginalPath } = await saveOriginalFile({
      buffer,
      mediaId,
      uploadedAt,
      extension,
    });

    const doc = buildInitialMediaDoc({
      id: mediaId,
      type: mediaType,
      filename: file.name,
      mimeType,
      extension,
      size: buffer.length,
      sha256,
      relativeOriginalPath,
      uploadedAt,
    });

    await indexMedia(doc);

    const jobName = mediaType === "image" ? "processImage" : "processVideo";
    await enqueueMediaJob(jobName, {
      mediaId,
      storageRoot: getStorageRoot(),
    });

    return NextResponse.json(
      { mediaId, status: "processing", sha256 },
      { status: 202 }
    );
  } catch (error) {
    console.error("upload error", error);
    return NextResponse.json(
      { error: "upload failed", detail: String(error) },
      { status: 500 }
    );
  }
}

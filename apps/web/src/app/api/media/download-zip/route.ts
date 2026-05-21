import archiver from "archiver";
import { getMediaById } from "@/lib/es";
import { getStorageRoot } from "@/lib/config";
import { PassThrough, Readable } from "node:stream";
import path from "node:path";
import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";

const MAX_FILES = 200;

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const mediaIds = body.mediaIds as string[] | undefined;

  if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
    return NextResponse.json(
      { error: "mediaIds array is required" },
      { status: 400 }
    );
  }

  if (mediaIds.length > MAX_FILES) {
    return NextResponse.json(
      { error: `maximum ${MAX_FILES} files per download` },
      { status: 400 }
    );
  }

  const storageRoot = getStorageRoot();
  const entries: { zipName: string; fullPath: string }[] = [];

  for (const id of mediaIds) {
    const doc = await getMediaById(id);
    if (!doc?.originalPath || doc.status !== "ready") continue;

    const fullPath = path.join(storageRoot, doc.originalPath);
    try {
      await access(fullPath);
    } catch {
      continue;
    }

    const zipName = `${id.slice(0, 8)}_${doc.filename}`;
    entries.push({ zipName, fullPath });
  }

  if (entries.length === 0) {
    return NextResponse.json(
      { error: "no downloadable files found" },
      { status: 400 }
    );
  }

  const archive = archiver("zip", { zlib: { level: 5 } });
  const passThrough = new PassThrough();
  archive.pipe(passThrough);

  archive.on("error", (err) => {
    passThrough.destroy(err);
  });

  for (const { zipName, fullPath } of entries) {
    archive.append(createReadStream(fullPath), { name: zipName });
  }

  void archive.finalize();

  const webStream = Readable.toWeb(passThrough) as ReadableStream;
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(webStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="photo-drive-${date}.zip"`,
    },
  });
}

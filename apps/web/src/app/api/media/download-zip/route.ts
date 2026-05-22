import { getMediaById } from "@/lib/es";
import { getStorageRoot } from "@/lib/config";
import {
  buildZipStream,
  collectZipEntries,
  sumZipEntryBytes,
} from "@/lib/zip-archive";
import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";

/** 요청당 최대 파일 수 (클라이언트는 100장 단위로 나눠 요청) */
const MAX_FILES = 100;

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
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
    const entries = await collectZipEntries(
      storageRoot,
      mediaIds,
      getMediaById
    );

    if (entries.length === 0) {
      return NextResponse.json(
        { error: "no downloadable files found" },
        { status: 400 }
      );
    }

    const sourceBytes = sumZipEntryBytes(entries);
    const passThrough = await buildZipStream(entries);
    const webStream = Readable.toWeb(passThrough) as ReadableStream;
    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="photo-drive-${date}.zip"`,
        "X-Source-Bytes": String(sourceBytes),
      },
    });
  } catch (error) {
    console.error("download-zip error", error);
    return NextResponse.json(
      { error: "zip creation failed", detail: String(error) },
      { status: 500 }
    );
  }
}

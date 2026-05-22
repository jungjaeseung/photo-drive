import { requireSession } from "@/lib/require-session";
import { previewUploadMetadata } from "@/lib/debug-metadata";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const { unauthorized } = await requireSession();
  if (unauthorized) return unauthorized;

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

    const lastModifiedRaw = formData.get("fileLastModified");
    const fileLastModified =
      typeof lastModifiedRaw === "string"
        ? parseInt(lastModifiedRaw, 10)
        : file.lastModified;

    const preview = await previewUploadMetadata({
      buffer,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      fileLastModified,
    });

    return NextResponse.json(preview);
  } catch (error) {
    console.error("debug metadata error", error);
    return NextResponse.json(
      { error: "preview failed", detail: String(error) },
      { status: 500 }
    );
  }
}

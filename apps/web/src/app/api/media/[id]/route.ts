import { requireSession } from "@/lib/require-session";
import { deleteMediaItems } from "@/lib/media-delete";
import { getMediaById } from "@/lib/es";
import { getMediaAssetUrl } from "@/lib/media-url";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { unauthorized } = await requireSession();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const doc = await getMediaById(id);
  if (!doc) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...doc,
    thumbnailUrl: getMediaAssetUrl(doc, "thumb"),
    previewUrl: getMediaAssetUrl(doc, "medium"),
    originalUrl: getMediaAssetUrl(doc, "original"),
    posterUrl: getMediaAssetUrl(doc, "poster"),
    videoPreviewUrl: getMediaAssetUrl(doc, "preview"),
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { unauthorized } = await requireSession();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const doc = await getMediaById(id);
  if (!doc) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const { deleted } = await deleteMediaItems([id]);
  if (deleted === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, mediaId: id });
}

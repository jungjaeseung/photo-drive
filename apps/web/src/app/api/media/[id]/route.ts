import { syncAlbumCover } from "@/lib/album-cover";
import { getMediaById, updateMedia } from "@/lib/es";
import { enqueueMediaJob } from "@/lib/queue";
import { getMediaAssetUrl } from "@/lib/media-url";
import { getStorageRoot } from "@/lib/config";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
  const { id } = await params;
  const doc = await getMediaById(id);
  if (!doc) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await updateMedia(id, {
    status: "deleting",
    deletedAt: new Date().toISOString(),
  });

  await enqueueMediaJob("deleteMedia", {
    mediaId: id,
    storageRoot: getStorageRoot(),
  });

  await Promise.all(doc.albumIds.map((albumId) => syncAlbumCover(albumId)));

  return NextResponse.json({ ok: true, mediaId: id });
}

import {
  countMediaInAlbum,
  getAlbumById,
  getMediaById,
  updateAlbum,
  updateMedia,
} from "@/lib/es";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: albumId } = await params;
  const album = await getAlbumById(albumId);
  if (!album) {
    return NextResponse.json({ error: "album not found" }, { status: 404 });
  }

  const body = await request.json();
  const mediaId = body.mediaId as string;
  if (!mediaId) {
    return NextResponse.json({ error: "mediaId required" }, { status: 400 });
  }

  const media = await getMediaById(mediaId);
  if (!media) {
    return NextResponse.json({ error: "media not found" }, { status: 404 });
  }

  const albumIds = Array.from(new Set([...media.albumIds, albumId]));
  await updateMedia(mediaId, { albumIds });

  const mediaCount = await countMediaInAlbum(albumId);
  await updateAlbum(albumId, {
    mediaCount,
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, albumIds });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: albumId } = await params;
  const { searchParams } = request.nextUrl;
  const mediaId = searchParams.get("mediaId");
  if (!mediaId) {
    return NextResponse.json({ error: "mediaId required" }, { status: 400 });
  }

  const media = await getMediaById(mediaId);
  if (!media) {
    return NextResponse.json({ error: "media not found" }, { status: 404 });
  }

  const albumIds = media.albumIds.filter((a) => a !== albumId);
  await updateMedia(mediaId, { albumIds });

  const mediaCount = await countMediaInAlbum(albumId);
  await updateAlbum(albumId, {
    mediaCount,
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, albumIds });
}

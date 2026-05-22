import {
  onCoverMediaRemoved,
  refreshAlbumMediaCount,
  setAlbumCoverIfEmpty,
} from "@/lib/album-cover";
import {
  appendAlbumToMediaBulk,
  getAlbumById,
  refreshMediaIndex,
  removeAlbumFromMediaBulk,
} from "@/lib/es";
import { NextRequest, NextResponse } from "next/server";

function parseMediaIds(body: {
  mediaId?: string;
  mediaIds?: unknown;
}): string[] {
  if (Array.isArray(body.mediaIds)) {
    return [
      ...new Set(
        body.mediaIds.filter((id): id is string => typeof id === "string" && !!id)
      ),
    ];
  }
  if (typeof body.mediaId === "string" && body.mediaId) {
    return [body.mediaId];
  }
  return [];
}

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
  const mediaIds = parseMediaIds(body);
  if (mediaIds.length === 0) {
    return NextResponse.json(
      { error: "mediaId or mediaIds required" },
      { status: 400 }
    );
  }

  const hadNoCover = !album.coverMediaId;

  const updated = await appendAlbumToMediaBulk(albumId, mediaIds);
  await refreshMediaIndex();

  if (hadNoCover && mediaIds[0]) {
    await setAlbumCoverIfEmpty(albumId, mediaIds[0]);
  }
  await refreshAlbumMediaCount(albumId);

  return NextResponse.json({ ok: true, updated, total: mediaIds.length });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: albumId } = await params;
  const album = await getAlbumById(albumId);
  if (!album) {
    return NextResponse.json({ error: "album not found" }, { status: 404 });
  }

  const { searchParams } = request.nextUrl;

  let mediaIds = searchParams.getAll("mediaId");
  const single = searchParams.get("mediaId");
  if (mediaIds.length === 0 && single) {
    mediaIds = [single];
  }
  mediaIds = [...new Set(mediaIds.filter(Boolean))];

  if (mediaIds.length === 0) {
    return NextResponse.json({ error: "mediaId required" }, { status: 400 });
  }

  const updated = await removeAlbumFromMediaBulk(albumId, mediaIds);
  await refreshMediaIndex();

  if (album.coverMediaId && mediaIds.includes(album.coverMediaId)) {
    await onCoverMediaRemoved(albumId, album.coverMediaId);
  } else {
    await refreshAlbumMediaCount(albumId);
  }

  return NextResponse.json({ ok: true, updated, total: mediaIds.length });
}

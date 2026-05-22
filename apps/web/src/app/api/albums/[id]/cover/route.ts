import { requireSession } from "@/lib/require-session";
import { setAlbumCover } from "@/lib/album-cover";
import { getAlbumById } from "@/lib/es";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { unauthorized } = await requireSession();
  if (unauthorized) return unauthorized;

  const { id: albumId } = await params;
  const album = await getAlbumById(albumId);
  if (!album) {
    return NextResponse.json({ error: "album not found" }, { status: 404 });
  }

  const body = await request.json();
  const mediaId =
    typeof body.mediaId === "string" ? body.mediaId.trim() : "";
  if (!mediaId) {
    return NextResponse.json({ error: "mediaId required" }, { status: 400 });
  }

  try {
    await setAlbumCover(albumId, mediaId);
  } catch {
    return NextResponse.json(
      { error: "media not in album or not ready" },
      { status: 400 }
    );
  }

  const updated = await getAlbumById(albumId);
  return NextResponse.json({ ok: true, coverMediaId: updated?.coverMediaId });
}

import { getAlbumById, listMediaIdsInAlbum } from "@/lib/es";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: albumId } = await params;
  const album = await getAlbumById(albumId);
  if (!album) {
    return NextResponse.json({ error: "album not found" }, { status: 404 });
  }

  const mediaIds = await listMediaIdsInAlbum(albumId);
  return NextResponse.json({ mediaIds, total: mediaIds.length });
}

import { requireSession } from "@/lib/require-session";
import { resolveAlbumCoverThumbnail } from "@/lib/album-cover";
import { countMediaInAlbum, indexAlbum, listAlbums } from "@/lib/es";
import type { AlbumDocument } from "@photo-drive/shared";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const { unauthorized } = await requireSession();
  if (unauthorized) return unauthorized;

  const albums = await listAlbums();
  const items = await Promise.all(
    albums.map(async (album) => ({
      ...album,
      mediaCount: await countMediaInAlbum(album.id),
      coverThumbnailUrl: await resolveAlbumCoverThumbnail(album),
    }))
  );
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const { unauthorized } = await requireSession();
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const name = (body.name as string)?.trim();
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const doc: AlbumDocument = {
    id: uuidv4(),
    name,
    description: body.description,
    mediaCount: 0,
    sortOrder: Date.now(),
    createdAt: now,
    updatedAt: now,
  };

  await indexAlbum(doc);
  return NextResponse.json(doc, { status: 201 });
}

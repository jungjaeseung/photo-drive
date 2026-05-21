import { indexAlbum, listAlbums } from "@/lib/es";
import type { AlbumDocument } from "@photo-drive/shared";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const albums = await listAlbums();
  return NextResponse.json({ items: albums });
}

export async function POST(request: NextRequest) {
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
    createdAt: now,
    updatedAt: now,
  };

  await indexAlbum(doc);
  return NextResponse.json(doc, { status: 201 });
}

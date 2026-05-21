import {
  countMediaInAlbum,
  deleteAlbumDoc,
  detachAlbumFromAllMedia,
  getAlbumById,
  updateAlbum,
} from "@/lib/es";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const album = await getAlbumById(id);
  if (!album) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const mediaCount = await countMediaInAlbum(id);
  return NextResponse.json({ ...album, mediaCount });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const album = await getAlbumById(id);
  if (!album) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const body = await request.json();
  const partial: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };
  if (body.name) partial.name = String(body.name).trim();
  if (body.description !== undefined) partial.description = body.description;

  await updateAlbum(id, partial);
  const updated = await getAlbumById(id);
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const album = await getAlbumById(id);
  if (!album) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const mediaUpdated = await detachAlbumFromAllMedia(id);
  await deleteAlbumDoc(id);
  return NextResponse.json({ ok: true, mediaUpdated });
}

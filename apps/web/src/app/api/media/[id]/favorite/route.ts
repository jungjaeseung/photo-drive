import { requireSession } from "@/lib/require-session";
import { getMediaById } from "@/lib/es";
import { addFavorite, isFavorite, removeFavorite } from "@/lib/es-favorites";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, unauthorized } = await requireSession();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const doc = await getMediaById(id);
  if (!doc) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const favorited = await isFavorite(session.user.id, id);
  return NextResponse.json({ favorited });
}

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, unauthorized } = await requireSession();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const doc = await getMediaById(id);
  if (!doc) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await addFavorite(session.user.id, id);
  return NextResponse.json({ favorited: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, unauthorized } = await requireSession();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  await removeFavorite(session.user.id, id);
  return NextResponse.json({ favorited: false });
}

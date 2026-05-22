import { requireSession } from "@/lib/require-session";
import { deleteMediaItems } from "@/lib/media-delete";
import { NextRequest, NextResponse } from "next/server";

function parseMediaIds(body: { mediaIds?: unknown }): string[] {
  if (!Array.isArray(body.mediaIds)) return [];
  return [
    ...new Set(
      body.mediaIds.filter((id): id is string => typeof id === "string" && !!id)
    ),
  ];
}

export async function POST(request: NextRequest) {
  const { unauthorized } = await requireSession();
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => ({}));
  const mediaIds = parseMediaIds(body);
  if (mediaIds.length === 0) {
    return NextResponse.json({ error: "mediaIds required" }, { status: 400 });
  }

  const { deleted, skipped } = await deleteMediaItems(mediaIds);
  return NextResponse.json({ ok: true, deleted, skipped, total: mediaIds.length });
}

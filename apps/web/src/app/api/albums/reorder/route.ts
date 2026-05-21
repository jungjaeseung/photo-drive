import { updateAlbum } from "@/lib/es";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const albumIds = body.albumIds as string[] | undefined;

  if (!Array.isArray(albumIds) || albumIds.length === 0) {
    return NextResponse.json(
      { error: "albumIds array is required" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  await Promise.all(
    albumIds.map((id, index) =>
      updateAlbum(id, { sortOrder: index, updatedAt: now })
    )
  );

  return NextResponse.json({ ok: true });
}

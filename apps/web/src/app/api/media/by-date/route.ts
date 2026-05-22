import { requireSession } from "@/lib/require-session";
import { searchMediaByDateKey } from "@/lib/es";
import { getMediaAssetUrl } from "@/lib/media-url";
import { sortMediaItems } from "@/lib/media-sort";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { unauthorized } = await requireSession();
  if (unauthorized) return unauthorized;

  const { searchParams } = request.nextUrl;
  const date = searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "invalid date" }, { status: 400 });
  }

  const type = searchParams.get("type") ?? undefined;
  const albumId = searchParams.get("albumId") ?? undefined;

  const docs = await searchMediaByDateKey({ dateKey: date, type, albumId });

  const items = sortMediaItems(
    docs.map((doc) => ({
      ...doc,
      thumbnailUrl: getMediaAssetUrl(doc, "thumb"),
      previewUrl: getMediaAssetUrl(doc, "medium"),
      originalUrl: getMediaAssetUrl(doc, "original"),
    }))
  );

  return NextResponse.json({ items, total: items.length });
}

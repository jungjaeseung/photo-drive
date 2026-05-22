import { requireSession } from "@/lib/require-session";
import { searchMedia } from "@/lib/es";
import { getMediaAssetUrl } from "@/lib/media-url";
import { sortMediaItems } from "@/lib/media-sort";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { unauthorized } = await requireSession();
  if (unauthorized) return unauthorized;

  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type") ?? undefined;
  const albumId = searchParams.get("albumId") ?? undefined;
  const cursor = searchParams.get("cursor") ?? undefined;
  const size = parseInt(searchParams.get("size") ?? "50", 10);

  const result = await searchMedia({ type, albumId, cursor, size });

  const items = sortMediaItems(
    result.items.map((doc) => ({
      ...doc,
      thumbnailUrl: getMediaAssetUrl(doc, "thumb"),
      previewUrl: getMediaAssetUrl(doc, "medium"),
      originalUrl: getMediaAssetUrl(doc, "original"),
    }))
  );

  return NextResponse.json({
    items,
    nextCursor: result.nextCursor,
    hasMore: result.hasMore,
  });
}

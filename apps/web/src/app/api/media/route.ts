import { requireSession } from "@/lib/require-session";
import { searchMedia } from "@/lib/es";
import { getFavoritedAmong, searchFavoritedMedia } from "@/lib/es-favorites";
import { getMediaAssetUrl } from "@/lib/media-url";
import { sortMediaItems } from "@/lib/media-sort";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { session, unauthorized } = await requireSession();
  if (unauthorized) return unauthorized;

  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type") ?? undefined;
  const albumId = searchParams.get("albumId") ?? undefined;
  const cursor = searchParams.get("cursor") ?? undefined;
  const size = parseInt(searchParams.get("size") ?? "50", 10);
  const favoritesOnly = searchParams.get("favoritesOnly") === "1";

  let result: Awaited<ReturnType<typeof searchMedia>>;
  try {
    result = favoritesOnly
      ? await searchFavoritedMedia({
          userId: session.user.id,
          type,
          cursor,
          size,
        })
      : await searchMedia({ type, albumId, cursor, size });
  } catch (error) {
    console.error("media list error", error);
    return NextResponse.json(
      { error: "failed to load media" },
      { status: 500 }
    );
  }

  const favoritedSet = favoritesOnly
    ? new Set(result.items.map((d) => d.id))
    : await getFavoritedAmong(
        session.user.id,
        result.items.map((d) => d.id)
      );

  const items = sortMediaItems(
    result.items.map((doc) => ({
      ...doc,
      thumbnailUrl: getMediaAssetUrl(doc, "thumb"),
      previewUrl: getMediaAssetUrl(doc, "medium"),
      originalUrl: getMediaAssetUrl(doc, "original"),
      favorited: favoritedSet.has(doc.id),
    }))
  );

  return NextResponse.json({
    items,
    nextCursor: result.nextCursor,
    hasMore: result.hasMore,
  });
}

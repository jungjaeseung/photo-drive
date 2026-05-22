import { requireSession } from "@/lib/require-session";
import { searchRandomReadyMedia } from "@/lib/es";
import { searchRandomFavoritedMedia } from "@/lib/es-favorites";
import { getMediaAssetUrl } from "@/lib/media-url";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, unauthorized } = await requireSession();
  if (unauthorized) return unauthorized;

  const seed = Date.now();

  const [photoDoc, videoDoc, favoriteDoc] = await Promise.all([
    searchRandomReadyMedia("image", { seed }),
    searchRandomReadyMedia("video", { seed: seed + 1 }),
    searchRandomFavoritedMedia(session.user.id, { seed: seed + 2 }),
  ]);

  return NextResponse.json({
    photoThumbnailUrl: photoDoc
      ? getMediaAssetUrl(photoDoc, "thumb")
      : undefined,
    videoThumbnailUrl: videoDoc
      ? getMediaAssetUrl(videoDoc, "thumb")
      : undefined,
    favoriteThumbnailUrl: favoriteDoc
      ? getMediaAssetUrl(favoriteDoc, "thumb")
      : undefined,
    photoMediaId: photoDoc?.id,
    videoMediaId: videoDoc?.id,
    favoriteMediaId: favoriteDoc?.id,
  });
}

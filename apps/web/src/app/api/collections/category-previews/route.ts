import { requireSession } from "@/lib/require-session";
import { searchRandomReadyMedia } from "@/lib/es";
import { getMediaAssetUrl } from "@/lib/media-url";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { unauthorized } = await requireSession();
  if (unauthorized) return unauthorized;

  const seed = Date.now();

  const [photoDoc, videoDoc] = await Promise.all([
    searchRandomReadyMedia("image", { seed }),
    searchRandomReadyMedia("video", { seed: seed + 1 }),
  ]);

  return NextResponse.json({
    photoThumbnailUrl: photoDoc
      ? getMediaAssetUrl(photoDoc, "thumb")
      : undefined,
    videoThumbnailUrl: videoDoc
      ? getMediaAssetUrl(videoDoc, "thumb")
      : undefined,
    photoMediaId: photoDoc?.id,
    videoMediaId: videoDoc?.id,
  });
}

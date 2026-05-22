import { searchRandomReadyMedia } from "@/lib/es";
import { getMediaAssetUrl } from "@/lib/media-url";
import { NextResponse } from "next/server";

export async function GET() {
  const seed = Date.now();

  const [photoDoc, videoDoc] = await Promise.all([
    searchRandomReadyMedia("image", { seed: seed }),
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

import type { AlbumDocument } from "@photo-drive/shared";
import { getMediaById, searchMedia } from "./es";
import { getMediaAssetUrl } from "./media-url";

export async function resolveAlbumCoverThumbnail(
  album: AlbumDocument
): Promise<string | undefined> {
  if (album.coverMediaId) {
    const media = await getMediaById(album.coverMediaId);
    if (media) return getMediaAssetUrl(media, "thumb");
  }

  const { items } = await searchMedia({ albumId: album.id, size: 1 });
  const first = items[0];
  if (!first) return undefined;
  return getMediaAssetUrl(first, "thumb");
}

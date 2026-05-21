import {
  ES_INDEX_ALBUMS,
  type AlbumDocument,
} from "@photo-drive/shared";
import {
  countMediaInAlbum,
  getEsClient,
  getMediaById,
  searchMedia,
  updateAlbum,
} from "./es";
import { getMediaAssetUrl } from "./media-url";

function isMediaInAlbum(
  media: { albumIds: string[]; deletedAt?: string },
  albumId: string
): boolean {
  return !media.deletedAt && media.albumIds.includes(albumId);
}

/** 최신 미디어 기준으로 앨범 커버 ID·개수 동기화 (추가/삭제 후 호출) */
export async function syncAlbumCover(albumId: string): Promise<void> {
  const mediaCount = await countMediaInAlbum(albumId);
  const { items } = await searchMedia({ albumId, size: 1 });
  const now = new Date().toISOString();

  if (items[0]) {
    await updateAlbum(albumId, {
      coverMediaId: items[0].id,
      mediaCount,
      updatedAt: now,
    });
    return;
  }

  const es = getEsClient();
  await es.update({
    index: ES_INDEX_ALBUMS,
    id: albumId,
    body: {
      script: {
        source:
          "ctx._source.remove('coverMediaId'); ctx._source.mediaCount = params.count; ctx._source.updatedAt = params.now",
        lang: "painless",
        params: { count: mediaCount, now },
      },
    },
    refresh: "wait_for",
  });
}

export async function resolveAlbumCoverThumbnail(
  album: AlbumDocument
): Promise<string | undefined> {
  if (album.coverMediaId) {
    const media = await getMediaById(album.coverMediaId);
    if (media && isMediaInAlbum(media, album.id)) {
      const url = getMediaAssetUrl(media, "thumb");
      if (url) return url;
    }
  }

  const { items } = await searchMedia({ albumId: album.id, size: 1 });
  const first = items[0];
  if (!first) return undefined;
  return getMediaAssetUrl(first, "thumb");
}

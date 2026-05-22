import {
  ES_INDEX_ALBUMS,
  type AlbumDocument,
} from "@photo-drive/shared";
import {
  countMediaInAlbum,
  getAlbumById,
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

function canBeAlbumCover(
  media: { albumIds: string[]; deletedAt?: string; status?: string },
  albumId: string
): boolean {
  return (
    isMediaInAlbum(media, albumId) &&
    (media.status === "ready" || media.status === "processing")
  );
}

export async function refreshAlbumMediaCount(albumId: string): Promise<number> {
  const mediaCount = await countMediaInAlbum(albumId);
  const now = new Date().toISOString();
  await updateAlbum(albumId, { mediaCount, updatedAt: now });
  return mediaCount;
}

export async function setAlbumCover(
  albumId: string,
  mediaId: string
): Promise<void> {
  const media = await getMediaById(mediaId);
  if (!media || !canBeAlbumCover(media, albumId)) {
    throw new Error("media not in album or not ready");
  }

  const now = new Date().toISOString();
  await updateAlbum(albumId, {
    coverMediaId: mediaId,
    updatedAt: now,
  });
}

export async function setAlbumCoverIfEmpty(
  albumId: string,
  mediaId: string
): Promise<void> {
  const album = await getAlbumById(albumId);
  if (!album || album.coverMediaId) return;
  await setAlbumCover(albumId, mediaId);
}

export async function reassignAlbumCoverFromLatest(
  albumId: string
): Promise<void> {
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

/** 커버였던 미디어가 앨범에서 사라졌을 때만 최신으로 재지정 */
export async function onCoverMediaRemoved(
  albumId: string,
  removedMediaId: string
): Promise<void> {
  const album = await getAlbumById(albumId);
  if (!album?.coverMediaId || album.coverMediaId !== removedMediaId) {
    return;
  }
  await reassignAlbumCoverFromLatest(albumId);
}

export async function resolveAlbumCoverThumbnail(
  album: AlbumDocument
): Promise<string | undefined> {
  if (album.coverMediaId) {
    const media = await getMediaById(album.coverMediaId);
    if (media && isMediaInAlbum(media, album.id) && media.status === "ready") {
      const url = getMediaAssetUrl(media, "thumb");
      if (url) return url;
    }
  }

  const { items } = await searchMedia({ albumId: album.id, size: 1 });
  const first = items[0];
  if (!first) return undefined;
  return getMediaAssetUrl(first, "thumb");
}

import {
  ES_INDEX_FAVORITES,
  type FavoriteDocument,
  type MediaDocument,
} from "@photo-drive/shared";
import { getEsClient, getMediaById } from "./es";

export function favoriteDocId(userId: string, mediaId: string): string {
  return `${userId}:${mediaId}`;
}

export async function addFavorite(
  userId: string,
  mediaId: string
): Promise<void> {
  const es = getEsClient();
  const now = new Date().toISOString();
  const doc: FavoriteDocument = { userId, mediaId, createdAt: now };
  await es.index({
    index: ES_INDEX_FAVORITES,
    id: favoriteDocId(userId, mediaId),
    body: doc,
    refresh: "wait_for",
  });
}

export async function removeFavorite(
  userId: string,
  mediaId: string
): Promise<void> {
  const es = getEsClient();
  try {
    await es.delete({
      index: ES_INDEX_FAVORITES,
      id: favoriteDocId(userId, mediaId),
      refresh: "wait_for",
    });
  } catch {
    /* already removed */
  }
}

export async function isFavorite(
  userId: string,
  mediaId: string
): Promise<boolean> {
  const es = getEsClient();
  try {
    const result = await es.exists({
      index: ES_INDEX_FAVORITES,
      id: favoriteDocId(userId, mediaId),
    });
    return result.body === true;
  } catch {
    return false;
  }
}

export async function getFavoritedAmong(
  userId: string,
  mediaIds: string[]
): Promise<Set<string>> {
  if (mediaIds.length === 0) return new Set();
  const es = getEsClient();
  const ids = mediaIds.map((mediaId) => favoriteDocId(userId, mediaId));
  const result = await es.mget({
    index: ES_INDEX_FAVORITES,
    body: { ids },
  });

  const favorited = new Set<string>();
  for (const doc of result.body.docs ?? []) {
    if (doc.found && doc._source) {
      const src = doc._source as FavoriteDocument;
      favorited.add(src.mediaId);
    }
  }
  return favorited;
}

export async function searchFavoritedMedia(params: {
  userId: string;
  type?: string;
  cursor?: string;
  size?: number;
}): Promise<{
  items: MediaDocument[];
  nextCursor?: string;
  hasMore: boolean;
}> {
  const es = getEsClient();
  const size = params.size ?? 50;
  const must: Record<string, unknown>[] = [{ term: { userId: params.userId } }];

  const sort = [
    { createdAt: { order: "desc", unmapped_type: "date" } },
    { mediaId: { order: "desc", unmapped_type: "keyword" } },
  ];

  const searchBody: Record<string, unknown> = {
    size: size + 1,
    query: { bool: { must } },
    sort,
  };

  if (params.cursor) {
    const parts = params.cursor.split("|");
    if (parts.length >= 2) {
      searchBody.search_after = [parts[0], parts[1]];
    }
  }

  const favResult = await es.search({
    index: ES_INDEX_FAVORITES,
    body: searchBody,
  });

  const favHits = (favResult.body.hits.hits ?? []) as Array<{
    _source: FavoriteDocument;
    sort?: [string | number, string | number];
  }>;

  const hasMore = favHits.length > size;
  const pageFavs = favHits.slice(0, size);
  const mediaIds = pageFavs.map((h) => h._source.mediaId);

  const items: MediaDocument[] = [];
  for (const mediaId of mediaIds) {
    const doc = await getMediaById(mediaId);
    if (!doc) continue;
    if (params.type && doc.type !== params.type) continue;
    items.push(doc);
  }

  const last = favHits[Math.min(size - 1, favHits.length - 1)];
  const nextCursor =
    hasMore && last?.sort && last.sort.length >= 2
      ? `${last.sort[0]}|${last.sort[1]}`
      : undefined;

  return { items, nextCursor, hasMore };
}

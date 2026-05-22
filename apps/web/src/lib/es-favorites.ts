import {
  ES_INDEX_FAVORITES,
  ES_INDEX_MEDIA,
  type FavoriteDocument,
  type MediaDocument,
} from "@photo-drive/shared";
import { getEsClient, getMediaById } from "./es";

const FAVORITE_MAPPINGS = {
  properties: {
    userId: { type: "keyword" },
    mediaId: { type: "keyword" },
    createdAt: { type: "date" },
  },
};

let ensureIndexPromise: Promise<void> | null = null;

export function favoriteDocId(userId: string, mediaId: string): string {
  return `${userId}:${mediaId}`;
}

export async function ensureFavoritesIndex(): Promise<void> {
  if (!ensureIndexPromise) {
    ensureIndexPromise = (async () => {
      const es = getEsClient();
      const exists = await es.indices.exists({ index: ES_INDEX_FAVORITES });
      if (exists.body) return;
      await es.indices.create({
        index: ES_INDEX_FAVORITES,
        body: { mappings: FAVORITE_MAPPINGS },
      });
    })();
  }
  await ensureIndexPromise;
}

function userIdQuery(userId: string): Record<string, unknown> {
  return {
    bool: {
      should: [
        { term: { userId } },
        { term: { "userId.keyword": userId } },
      ],
      minimum_should_match: 1,
    },
  };
}

export async function addFavorite(
  userId: string,
  mediaId: string
): Promise<void> {
  await ensureFavoritesIndex();
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
  await ensureFavoritesIndex();
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
  await ensureFavoritesIndex();
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
  await ensureFavoritesIndex();
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

async function fetchMediaByIdsOrdered(
  mediaIds: string[],
  type?: string
): Promise<MediaDocument[]> {
  if (mediaIds.length === 0) return [];

  const es = getEsClient();
  const result = await es.mget({
    index: ES_INDEX_MEDIA,
    body: { ids: mediaIds },
  });

  const byId = new Map<string, MediaDocument>();
  for (const doc of result.body.docs ?? []) {
    if (!doc.found || !doc._source) continue;
    const src = doc._source as MediaDocument;
    if (src.deletedAt) continue;
    byId.set(doc._id ?? src.id, src);
  }

  const items: MediaDocument[] = [];
  for (const id of mediaIds) {
    const doc = byId.get(id);
    if (!doc) continue;
    if (type && doc.type !== type) continue;
    items.push(doc);
  }
  return items;
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
  await ensureFavoritesIndex();
  const es = getEsClient();
  const size = params.size ?? 50;

  const searchBody: Record<string, unknown> = {
    size: size + 1,
    query: {
      bool: {
        must: [userIdQuery(params.userId)],
      },
    },
    sort: [
      { createdAt: { order: "desc", unmapped_type: "date" } },
      { mediaId: { order: "desc", unmapped_type: "keyword" } },
    ],
  };

  if (params.cursor) {
    const parts = params.cursor.split("|");
    if (parts.length >= 2) {
      searchBody.search_after = [parts[0], parts[1]];
    }
  }

  let favHits: Array<{
    _source: FavoriteDocument;
    sort?: [string | number, string | number];
  }> = [];

  try {
    const favResult = await es.search({
      index: ES_INDEX_FAVORITES,
      body: searchBody,
    });
    favHits = (favResult.body.hits.hits ?? []) as typeof favHits;
  } catch (err: unknown) {
    const statusCode =
      err &&
      typeof err === "object" &&
      "statusCode" in err &&
      typeof (err as { statusCode: number }).statusCode === "number"
        ? (err as { statusCode: number }).statusCode
        : 0;
    if (statusCode === 404) {
      return { items: [], hasMore: false };
    }
    throw err;
  }

  const hasMore = favHits.length > size;
  const pageFavs = favHits.slice(0, size);
  const mediaIds = pageFavs.map((h) => h._source.mediaId).filter(Boolean);

  const items = await fetchMediaByIdsOrdered(mediaIds, params.type);

  const last = favHits[Math.min(size - 1, favHits.length - 1)];
  const nextCursor =
    hasMore && last?.sort && last.sort.length >= 2
      ? `${last.sort[0]}|${last.sort[1]}`
      : undefined;

  return { items, nextCursor, hasMore };
}

/** 카테고리 썸네일용 — 즐겨찾기 중 ready 미디어 1건 랜덤 */
export async function searchRandomFavoritedMedia(
  userId: string,
  options?: { excludeMediaId?: string; seed?: number }
): Promise<MediaDocument | null> {
  await ensureFavoritesIndex();
  const es = getEsClient();

  const must: Record<string, unknown>[] = [userIdQuery(userId)];
  if (options?.excludeMediaId) {
    must.push({
      bool: { must_not: [{ term: { mediaId: options.excludeMediaId } }] },
    });
  }

  try {
    const favResult = await es.search({
      index: ES_INDEX_FAVORITES,
      body: {
        size: 1,
        query: {
          function_score: {
            query: { bool: { must } },
            random_score: {
              seed: options?.seed ?? Date.now(),
            },
          },
        },
      },
    });

    const hit = favResult.body.hits.hits[0];
    if (!hit?._source) return null;

    const mediaId = (hit._source as FavoriteDocument).mediaId;
    const doc = await getMediaById(mediaId);
    if (!doc || doc.deletedAt || doc.status !== "ready") return null;
    return doc;
  } catch (err: unknown) {
    const statusCode =
      err &&
      typeof err === "object" &&
      "statusCode" in err &&
      typeof (err as { statusCode: number }).statusCode === "number"
        ? (err as { statusCode: number }).statusCode
        : 0;
    if (statusCode === 404) return null;
    throw err;
  }
}

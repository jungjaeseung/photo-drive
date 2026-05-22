import { Client } from "@elastic/elasticsearch";
import {
  ES_INDEX_ALBUMS,
  ES_INDEX_MEDIA,
  type AlbumDocument,
  type MediaDocument,
} from "@photo-drive/shared";
import { getElasticsearchUrl } from "./config";

let client: Client | null = null;

export function getEsClient(): Client {
  if (!client) {
    client = new Client({ node: getElasticsearchUrl() });
  }
  return client;
}

export async function findMediaBySha256(sha256: string): Promise<MediaDocument | null> {
  const es = getEsClient();
  const result = await es.search({
    index: ES_INDEX_MEDIA,
    body: {
      size: 1,
      query: {
        bool: {
          must: [{ term: { sha256 } }],
          must_not: [{ exists: { field: "deletedAt" } }],
        },
      },
    },
  });

  const hit = result.body.hits.hits[0];
  if (!hit?._source) return null;
  return hit._source as MediaDocument;
}

export async function getMediaById(id: string): Promise<MediaDocument | null> {
  const es = getEsClient();
  try {
    const result = await es.get({ index: ES_INDEX_MEDIA, id });
    if (result.body._source?.deletedAt) return null;
    return result.body._source as MediaDocument;
  } catch {
    return null;
  }
}

export async function indexMedia(doc: MediaDocument): Promise<void> {
  const es = getEsClient();
  await es.index({
    index: ES_INDEX_MEDIA,
    id: doc.id,
    body: doc,
    refresh: "wait_for",
  });
}

export async function updateMedia(
  id: string,
  partial: Partial<MediaDocument>
): Promise<void> {
  const es = getEsClient();
  await es.update({
    index: ES_INDEX_MEDIA,
    id,
    body: { doc: partial },
    refresh: "wait_for",
  });
}

export async function searchMedia(params: {
  type?: string;
  albumId?: string;
  cursor?: string;
  size?: number;
}): Promise<{ items: MediaDocument[]; nextCursor?: string; hasMore: boolean }> {
  const es = getEsClient();
  const size = params.size ?? 50;
  const must: Record<string, unknown>[] = [
    { bool: { must_not: [{ exists: { field: "deletedAt" } }] } },
  ];

  if (params.type) {
    must.push({ term: { type: params.type } });
  }
  if (params.albumId) {
    must.push({ term: { albumIds: params.albumId } });
  }

  const sort = [
    { sortAt: { order: "desc", unmapped_type: "date", missing: "_last" } },
    { id: { order: "desc", unmapped_type: "keyword" } },
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

  const result = await es.search({
    index: ES_INDEX_MEDIA,
    body: searchBody,
  });

  const hits = (result.body.hits.hits ?? []) as Array<{
    _source: MediaDocument;
    sort?: [string | number, string | number, string];
  }>;

  const hasMore = hits.length > size;
  const items = hits.slice(0, size).map((h) => h._source);
  const last = hits[Math.min(size - 1, hits.length - 1)];
  const nextCursor =
    hasMore && last?.sort && last.sort.length >= 2
      ? `${last.sort[0]}|${last.sort[1]}`
      : undefined;

  return { items, nextCursor, hasMore };
}

/** 카테고리 썸네일용: ready 미디어 중 랜덤 1건 */
export async function searchRandomReadyMedia(
  type: "image" | "video",
  options?: { excludeId?: string; seed?: number }
): Promise<MediaDocument | null> {
  const es = getEsClient();
  const must: Record<string, unknown>[] = [
    { term: { type } },
    { term: { status: "ready" } },
    { bool: { must_not: [{ exists: { field: "deletedAt" } }] } },
  ];

  if (options?.excludeId) {
    must.push({
      bool: { must_not: [{ term: { id: options.excludeId } }] },
    });
  }

  const result = await es.search({
    index: ES_INDEX_MEDIA,
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

  const hit = result.body.hits.hits[0];
  if (!hit?._source) return null;
  return hit._source as MediaDocument;
}

export async function getAlbumById(id: string): Promise<AlbumDocument | null> {
  const es = getEsClient();
  try {
    const result = await es.get({ index: ES_INDEX_ALBUMS, id });
    return result.body._source as AlbumDocument;
  } catch {
    return null;
  }
}

export async function indexAlbum(doc: AlbumDocument): Promise<void> {
  const es = getEsClient();
  await es.index({
    index: ES_INDEX_ALBUMS,
    id: doc.id,
    body: doc,
    refresh: "wait_for",
  });
}

export async function updateAlbum(
  id: string,
  partial: Partial<AlbumDocument>
): Promise<void> {
  const es = getEsClient();
  await es.update({
    index: ES_INDEX_ALBUMS,
    id,
    body: { doc: partial },
    refresh: "wait_for",
  });
}

export async function deleteAlbumDoc(id: string): Promise<void> {
  const es = getEsClient();
  await es.delete({ index: ES_INDEX_ALBUMS, id, refresh: "wait_for" });
}

const ALBUM_MEDIA_BULK_CHUNK = 500;

/** 미디어 여러 건에 albumId를 한 번에 추가 (refresh는 호출 쪽에서 1회) */
export async function appendAlbumToMediaBulk(
  albumId: string,
  mediaIds: string[]
): Promise<number> {
  if (mediaIds.length === 0) return 0;
  const es = getEsClient();
  let updated = 0;

  for (let i = 0; i < mediaIds.length; i += ALBUM_MEDIA_BULK_CHUNK) {
    const chunk = mediaIds.slice(i, i + ALBUM_MEDIA_BULK_CHUNK);
    const result = await es.updateByQuery({
      index: ES_INDEX_MEDIA,
      body: {
        query: {
          bool: {
            must: [{ ids: { values: chunk } }],
            must_not: [{ exists: { field: "deletedAt" } }],
          },
        },
        script: {
          source: `
            if (ctx._source.albumIds == null) { ctx._source.albumIds = []; }
            if (!ctx._source.albumIds.contains(params.albumId)) {
              ctx._source.albumIds.add(params.albumId);
            }
          `,
          lang: "painless",
          params: { albumId },
        },
      },
    });
    updated += result.body.updated ?? 0;
  }

  return updated;
}

/** 미디어 여러 건에서 albumId를 한 번에 제거 */
export async function removeAlbumFromMediaBulk(
  albumId: string,
  mediaIds: string[]
): Promise<number> {
  if (mediaIds.length === 0) return 0;
  const es = getEsClient();
  let updated = 0;

  for (let i = 0; i < mediaIds.length; i += ALBUM_MEDIA_BULK_CHUNK) {
    const chunk = mediaIds.slice(i, i + ALBUM_MEDIA_BULK_CHUNK);
    const result = await es.updateByQuery({
      index: ES_INDEX_MEDIA,
      body: {
        query: {
          bool: {
            must: [{ ids: { values: chunk } }],
            must_not: [{ exists: { field: "deletedAt" } }],
          },
        },
        script: {
          source:
            "if (ctx._source.albumIds != null) { ctx._source.albumIds.removeIf(id -> id == params.albumId); }",
          lang: "painless",
          params: { albumId },
        },
      },
    });
    updated += result.body.updated ?? 0;
  }

  return updated;
}

export async function refreshMediaIndex(): Promise<void> {
  const es = getEsClient();
  await es.indices.refresh({ index: ES_INDEX_MEDIA });
}

const MEDIA_BULK_CHUNK = 500;

/** 삭제 대상 미디어의 albumIds 수집 (이미 deletedAt 있으면 제외) */
export async function collectAlbumIdsForMediaIds(
  mediaIds: string[]
): Promise<{ deletableIds: string[]; albumIds: Set<string> }> {
  if (mediaIds.length === 0) {
    return { deletableIds: [], albumIds: new Set() };
  }
  const es = getEsClient();
  const deletableIds: string[] = [];
  const albumIds = new Set<string>();

  for (let i = 0; i < mediaIds.length; i += MEDIA_BULK_CHUNK) {
    const chunk = mediaIds.slice(i, i + MEDIA_BULK_CHUNK);
    const result = await es.mget({
      index: ES_INDEX_MEDIA,
      body: { ids: chunk },
    });

    for (const doc of result.body.docs ?? []) {
      if (!doc.found || !doc._source) continue;
      const src = doc._source as MediaDocument;
      if (src.deletedAt) continue;
      deletableIds.push(src.id);
      for (const albumId of src.albumIds ?? []) {
        albumIds.add(albumId);
      }
    }
  }

  return { deletableIds, albumIds };
}

/** 여러 미디어를 deleting 상태로 일괄 표시 */
export async function markMediaDeletingBulk(
  mediaIds: string[],
  deletedAt: string
): Promise<number> {
  if (mediaIds.length === 0) return 0;
  const es = getEsClient();
  let updated = 0;

  for (let i = 0; i < mediaIds.length; i += MEDIA_BULK_CHUNK) {
    const chunk = mediaIds.slice(i, i + MEDIA_BULK_CHUNK);
    const result = await es.updateByQuery({
      index: ES_INDEX_MEDIA,
      body: {
        query: {
          bool: {
            must: [{ ids: { values: chunk } }],
            must_not: [{ exists: { field: "deletedAt" } }],
          },
        },
        script: {
          source:
            "ctx._source.status = params.status; ctx._source.deletedAt = params.deletedAt;",
          lang: "painless",
          params: { status: "deleting", deletedAt },
        },
      },
    });
    updated += result.body.updated ?? 0;
  }

  return updated;
}

export async function detachAlbumFromAllMedia(
  albumId: string
): Promise<number> {
  const es = getEsClient();
  const result = await es.updateByQuery({
    index: ES_INDEX_MEDIA,
    refresh: true,
    body: {
      query: {
        bool: {
          must: [{ term: { albumIds: albumId } }],
          must_not: [{ exists: { field: "deletedAt" } }],
        },
      },
      script: {
        source:
          "if (ctx._source.albumIds != null) { ctx._source.albumIds.removeIf(id -> id == params.albumId); }",
        params: { albumId },
      },
    },
  });
  return result.body.updated ?? 0;
}

export async function listAlbums(): Promise<AlbumDocument[]> {
  const es = getEsClient();
  const result = await es.search({
    index: ES_INDEX_ALBUMS,
    body: {
      size: 200,
      sort: [
        { sortOrder: { order: "asc", unmapped_type: "long" } },
        { updatedAt: "desc" },
      ],
    },
  });
  const albums = (result.body.hits.hits ?? []).map(
    (h: { _source: AlbumDocument }) => h._source
  );
  return albums.sort((a: AlbumDocument, b: AlbumDocument) => {
    const ao = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const bo = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

const MAX_ALBUM_MEDIA_IDS = 10_000;

/** 앨범에 속한 미디어 ID 목록 (다운로드용) */
export async function listMediaIdsInAlbum(
  albumId: string,
  max = MAX_ALBUM_MEDIA_IDS
): Promise<string[]> {
  const ids: string[] = [];
  let cursor: string | undefined;

  while (ids.length < max) {
    const { items, nextCursor, hasMore } = await searchMedia({
      albumId,
      cursor,
      size: Math.min(100, max - ids.length),
    });
    ids.push(...items.map((doc) => doc.id));
    if (!hasMore || !nextCursor) break;
    cursor = nextCursor;
  }

  return ids;
}

export async function countMediaInAlbum(albumId: string): Promise<number> {
  const es = getEsClient();
  const result = await es.count({
    index: ES_INDEX_MEDIA,
    body: {
      query: {
        bool: {
          must: [{ term: { albumIds: albumId } }],
          must_not: [{ exists: { field: "deletedAt" } }],
        },
      },
    },
  });
  return result.body.count ?? 0;
}

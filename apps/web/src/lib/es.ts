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

  const sort = [{ uploadedAt: "desc" }, { id: "desc" }];
  const searchBody: Record<string, unknown> = {
    size: size + 1,
    query: { bool: { must } },
    sort,
  };

  if (params.cursor) {
    const [uploadedAt, id] = params.cursor.split("|");
    searchBody.search_after = [uploadedAt, id];
  }

  const result = await es.search({
    index: ES_INDEX_MEDIA,
    body: searchBody,
  });

  const hits = (result.body.hits.hits ?? []) as Array<{
    _source: MediaDocument;
    sort?: [string, string];
  }>;

  const hasMore = hits.length > size;
  const items = hits.slice(0, size).map((h) => h._source);
  const last = hits[Math.min(size - 1, hits.length - 1)];
  const nextCursor =
    hasMore && last?.sort
      ? `${last.sort[0]}|${last.sort[1]}`
      : hasMore && items.length
        ? `${items[items.length - 1].uploadedAt}|${items[items.length - 1].id}`
        : undefined;

  return { items, nextCursor, hasMore };
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

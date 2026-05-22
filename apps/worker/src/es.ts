import { Client } from "@elastic/elasticsearch";
import { ES_INDEX_MEDIA, type MediaDocument } from "@photo-drive/shared";
import { getElasticsearchUrl } from "./config.js";

let client: Client | null = null;

function getClient(): Client {
  if (!client) client = new Client({ node: getElasticsearchUrl() });
  return client;
}

export async function getMediaById(id: string): Promise<MediaDocument | null> {
  try {
    const result = await getClient().get({ index: ES_INDEX_MEDIA, id });
    return result.body._source as MediaDocument;
  } catch {
    return null;
  }
}

export async function updateMedia(
  id: string,
  partial: Partial<MediaDocument>
): Promise<void> {
  await getClient().update({
    index: ES_INDEX_MEDIA,
    id,
    body: { doc: partial },
    refresh: "wait_for",
  });
}

export async function scrollReadyImageIds(): Promise<string[]> {
  const client = getClient();
  const ids: string[] = [];
  const scrollMs = "5m";

  let response = await client.search({
    index: ES_INDEX_MEDIA,
    scroll: scrollMs,
    size: 200,
    body: {
      query: {
        bool: {
          must: [
            { term: { type: "image" } },
            { term: { status: "ready" } },
          ],
          must_not: [{ exists: { field: "deletedAt" } }],
        },
      },
      _source: false,
    },
  });

  let scrollId = response.body._scroll_id as string | undefined;

  while (true) {
    const hits = response.body.hits?.hits ?? [];
    for (const hit of hits) {
      if (hit._id) ids.push(hit._id);
    }
    if (hits.length === 0) break;

    response = await client.scroll({
      scroll_id: scrollId,
      scroll: scrollMs,
    });
    scrollId = response.body._scroll_id as string | undefined;
  }

  if (scrollId) {
    await client.clearScroll({ scroll_id: scrollId }).catch(() => {});
  }

  return ids;
}

/** 재변환 대상: failed·썸네일 없는 ready·오래된 processing */
export async function scrollVideoIdsNeedingReprocess(): Promise<string[]> {
  const client = getClient();
  const ids: string[] = [];
  const scrollMs = "5m";

  let response = await client.search({
    index: ES_INDEX_MEDIA,
    scroll: scrollMs,
    size: 200,
    body: {
      query: {
        bool: {
          must: [{ term: { type: "video" } }],
          must_not: [{ exists: { field: "deletedAt" } }],
          should: [
            { term: { status: "failed" } },
            { term: { status: "processing" } },
            {
              bool: {
                must: [
                  { term: { status: "ready" } },
                  {
                    bool: {
                      should: [
                        {
                          bool: {
                            must_not: [{ exists: { field: "thumbnailPath" } }],
                          },
                        },
                        {
                          bool: {
                            must_not: [{ exists: { field: "duration" } }],
                          },
                        },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                ],
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
      _source: false,
    },
  });

  let scrollId = response.body._scroll_id as string | undefined;

  while (true) {
    const hits = response.body.hits?.hits ?? [];
    for (const hit of hits) {
      if (hit._id) ids.push(hit._id);
    }
    if (hits.length === 0) break;

    response = await client.scroll({
      scroll_id: scrollId,
      scroll: scrollMs,
    });
    scrollId = response.body._scroll_id as string | undefined;
  }

  if (scrollId) {
    await client.clearScroll({ scroll_id: scrollId }).catch(() => {});
  }

  return ids;
}

export async function deleteMediaDoc(id: string): Promise<void> {
  await getClient().delete({
    index: ES_INDEX_MEDIA,
    id,
    refresh: "wait_for",
  });
}

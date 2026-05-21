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

export async function deleteMediaDoc(id: string): Promise<void> {
  await getClient().delete({
    index: ES_INDEX_MEDIA,
    id,
    refresh: "wait_for",
  });
}

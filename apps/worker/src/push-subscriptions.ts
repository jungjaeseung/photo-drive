import { createHash } from "node:crypto";
import { Client } from "@elastic/elasticsearch";
import { ES_INDEX_PUSH_SUBSCRIPTIONS } from "@photo-drive/shared";
import { getElasticsearchUrl } from "./config.js";

export interface PushSubscriptionRecord {
  endpoint: string;
  subscription: PushSubscriptionJSON;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}

let client: Client | null = null;

function getClient(): Client {
  if (!client) client = new Client({ node: getElasticsearchUrl() });
  return client;
}

function subscriptionDocId(endpoint: string): string {
  return createHash("sha256").update(endpoint).digest("hex");
}

export async function listPushSubscriptions(): Promise<PushSubscriptionRecord[]> {
  const result = await getClient().search({
    index: ES_INDEX_PUSH_SUBSCRIPTIONS,
    body: { size: 500, query: { match_all: {} } },
  });
  return (result.body.hits.hits ?? []).map(
    (h: { _source: PushSubscriptionRecord }) => h._source
  );
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  try {
    await getClient().delete({
      index: ES_INDEX_PUSH_SUBSCRIPTIONS,
      id: subscriptionDocId(endpoint),
      refresh: "wait_for",
    });
  } catch {
    // already removed
  }
}

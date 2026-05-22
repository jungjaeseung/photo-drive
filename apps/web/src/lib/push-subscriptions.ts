import { createHash } from "node:crypto";
import { getEsClient } from "@/lib/es";
import { ES_INDEX_PUSH_SUBSCRIPTIONS } from "@photo-drive/shared";

export interface PushSubscriptionRecord {
  endpoint: string;
  subscription: PushSubscriptionJSON;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}

export function subscriptionDocId(endpoint: string): string {
  return createHash("sha256").update(endpoint).digest("hex");
}

export async function savePushSubscription(
  subscription: PushSubscriptionJSON,
  userAgent?: string
): Promise<void> {
  const endpoint = subscription.endpoint;
  if (!endpoint) throw new Error("subscription.endpoint required");

  const now = new Date().toISOString();
  const id = subscriptionDocId(endpoint);
  const es = getEsClient();

  let createdAt = now;
  try {
    const existing = await es.get({
      index: ES_INDEX_PUSH_SUBSCRIPTIONS,
      id,
    });
    createdAt =
      (existing.body._source as PushSubscriptionRecord)?.createdAt ?? now;
  } catch {
    // new subscription
  }

  await es.index({
    index: ES_INDEX_PUSH_SUBSCRIPTIONS,
    id,
    body: {
      endpoint,
      subscription,
      userAgent,
      createdAt,
      updatedAt: now,
    } satisfies PushSubscriptionRecord,
    refresh: "wait_for",
  });
}

export async function listPushSubscriptions(): Promise<PushSubscriptionRecord[]> {
  const es = getEsClient();
  const result = await es.search({
    index: ES_INDEX_PUSH_SUBSCRIPTIONS,
    body: { size: 500, query: { match_all: {} } },
  });
  return (result.body.hits.hits ?? []).map(
    (h: { _source: PushSubscriptionRecord }) => h._source
  );
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  const es = getEsClient();
  try {
    await es.delete({
      index: ES_INDEX_PUSH_SUBSCRIPTIONS,
      id: subscriptionDocId(endpoint),
      refresh: "wait_for",
    });
  } catch {
    // already removed
  }
}

import { Redis } from "ioredis";
import { getRedisUrl } from "./config.js";

const BATCH_TTL_SEC = 86_400;

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(getRedisUrl(), { maxRetriesPerRequest: 2 });
  }
  return redis;
}

function keys(batchId: string) {
  const p = `photo-drive:push:batch:${batchId}`;
  return {
    ready: `${p}:ready`,
    expected: `${p}:expected`,
    sent: `${p}:sent`,
  };
}

export async function addBatchReadyItem(
  batchId: string,
  mediaId: string
): Promise<void> {
  const k = keys(batchId);
  const r = getRedis();
  await r.sadd(k.ready, mediaId);
  await r.expire(k.ready, BATCH_TTL_SEC);
}

export async function setBatchExpectedCount(
  batchId: string,
  count: number
): Promise<void> {
  const k = keys(batchId);
  const r = getRedis();
  await r.set(k.expected, String(count), "EX", BATCH_TTL_SEC);
}

export async function getBatchReadyCount(batchId: string): Promise<number> {
  return getRedis().scard(keys(batchId).ready);
}

export async function tryClaimBatchSend(batchId: string): Promise<boolean> {
  const k = keys(batchId);
  const r = getRedis();
  const claimed = await r.set(k.sent, "1", "EX", BATCH_TTL_SEC, "NX");
  return claimed === "OK";
}

export async function clearBatchKeys(batchId: string): Promise<void> {
  const k = keys(batchId);
  const r = getRedis();
  await r.del(k.ready, k.expected, k.sent);
}

export async function getBatchExpected(
  batchId: string
): Promise<number | null> {
  const raw = await getRedis().get(keys(batchId).expected);
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

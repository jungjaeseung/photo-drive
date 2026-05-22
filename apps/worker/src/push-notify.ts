import webpush from "web-push";
import {
  listPushSubscriptions,
  removePushSubscription,
} from "./push-subscriptions.js";
import {
  addBatchReadyItem,
  clearBatchKeys,
  getBatchExpected,
  getBatchReadyCount,
  setBatchExpectedCount,
  tryClaimBatchSend,
} from "./push-batch-redis.js";

/** 배치 ID 없는 단건·구버전: 마지막 ready 후 이 시간 지나면 1회 발송 */
const LEGACY_IDLE_MS = 120_000;

let legacyPendingCount = 0;
let legacyFlushTimer: ReturnType<typeof setTimeout> | null = null;
let vapidConfigured = false;

function ensureVapid(): boolean {
  if (vapidConfigured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    console.warn(
      "[push] VAPID 미설정 — worker에 VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT 필요"
    );
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

function appOrigin(): string {
  return (process.env.PUBLIC_APP_URL ?? "").replace(/\/$/, "");
}

function notificationPayload(count: number): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/photos";
  const root = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
  const origin = appOrigin();
  const prefix = origin || "";
  return JSON.stringify({
    title: "업로드 완료",
    body: `${count}개의 파일이 업로드 되었습니다.`,
    url: `${prefix}${root}/`,
    icon: `${prefix}${root}/icons/icon-192.png`,
  });
}

async function sendPushToAllDevices(count: number): Promise<void> {
  if (!ensureVapid()) return;

  const records = await listPushSubscriptions();
  if (records.length === 0) {
    console.warn(
      "[push] 구독 기기 0대 — iPhone에서 홈 화면 앱 → 알림 받기 후 다시 시도"
    );
    return;
  }

  const payload = notificationPayload(count);
  let ok = 0;
  let fail = 0;

  await Promise.allSettled(
    records.map(async (record) => {
      try {
        await webpush.sendNotification(
          record.subscription as webpush.PushSubscription,
          payload
        );
        ok += 1;
      } catch (err: unknown) {
        fail += 1;
        const statusCode =
          err &&
          typeof err === "object" &&
          "statusCode" in err &&
          typeof (err as { statusCode: number }).statusCode === "number"
            ? (err as { statusCode: number }).statusCode
            : 0;
        if (statusCode === 404 || statusCode === 410) {
          await removePushSubscription(record.endpoint);
          console.warn("[push] 만료 구독 삭제:", statusCode);
        } else {
          console.warn(
            "[push] 발송 실패:",
            statusCode,
            record.endpoint.slice(0, 60),
            err
          );
        }
      }
    })
  );

  console.log(
    `[push] 업로드 완료 알림: ${count}건 → ${records.length}대 중 성공 ${ok}, 실패 ${fail}`
  );
}

async function tryFlushBatch(batchId: string): Promise<void> {
  const expected = await getBatchExpected(batchId);
  if (expected == null || expected <= 0) return;

  const ready = await getBatchReadyCount(batchId);
  if (ready < expected) return;

  const claimed = await tryClaimBatchSend(batchId);
  if (!claimed) return;

  await sendPushToAllDevices(expected);
  await clearBatchKeys(batchId);
}

/** notifyUploadBatch job — 클라이언트가 배치 종료 시 기대 건수 전달 */
export async function finalizeUploadBatch(
  batchId: string,
  expectedCount: number
): Promise<void> {
  if (expectedCount <= 0) return;
  await setBatchExpectedCount(batchId, expectedCount);
  await tryFlushBatch(batchId);
}

async function flushLegacyNotifications(): Promise<void> {
  const count = legacyPendingCount;
  legacyPendingCount = 0;
  legacyFlushTimer = null;
  if (count === 0) return;
  await sendPushToAllDevices(count);
}

/**
 * 업로드 처리 완료(ready) 시 호출.
 * uploadBatchId가 있으면 배치가 모일 때까지 대기, 없으면 legacy idle 묶음.
 */
export function scheduleUploadCompleteNotify(
  uploadBatchId?: string,
  mediaId?: string
): void {
  if (!ensureVapid()) return;

  if (uploadBatchId && mediaId) {
    void (async () => {
      await addBatchReadyItem(uploadBatchId, mediaId);
      await tryFlushBatch(uploadBatchId);
    })();
    return;
  }

  legacyPendingCount += 1;
  if (legacyFlushTimer) clearTimeout(legacyFlushTimer);
  legacyFlushTimer = setTimeout(() => {
    void flushLegacyNotifications();
  }, LEGACY_IDLE_MS);
}

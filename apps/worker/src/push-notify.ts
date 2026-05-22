import webpush from "web-push";
import {
  listPushSubscriptions,
  removePushSubscription,
} from "./push-subscriptions.js";

const DEBOUNCE_MS = 3000;

let pendingCount = 0;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let vapidConfigured = false;

function ensureVapid(): boolean {
  if (vapidConfigured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

function notificationPayload(count: number): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/photos";
  const root = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
  return JSON.stringify({
    title: "Photo Drive",
    body: `${count}개의 파일이 업로드 되었습니다`,
    url: `${root}/`,
    icon: `${root}/icons/icon-192.png`,
  });
}

async function flushNotifications(): Promise<void> {
  const count = pendingCount;
  pendingCount = 0;
  flushTimer = null;
  if (count === 0 || !ensureVapid()) return;

  const records = await listPushSubscriptions();
  if (records.length === 0) return;

  const payload = notificationPayload(count);

  await Promise.allSettled(
    records.map(async (record) => {
      try {
        await webpush.sendNotification(
          record.subscription as webpush.PushSubscription,
          payload
        );
      } catch (err: unknown) {
        const statusCode =
          err &&
          typeof err === "object" &&
          "statusCode" in err &&
          typeof (err as { statusCode: number }).statusCode === "number"
            ? (err as { statusCode: number }).statusCode
            : 0;
        if (statusCode === 404 || statusCode === 410) {
          await removePushSubscription(record.endpoint);
        } else {
          console.warn("Push send failed:", record.endpoint, err);
        }
      }
    })
  );
}

/** 업로드 처리 완료(ready) 건수를 묶어 푸시 알림 예약 */
export function scheduleUploadCompleteNotify(): void {
  if (!ensureVapid()) return;
  pendingCount += 1;
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    void flushNotifications();
  }, DEBOUNCE_MS);
}

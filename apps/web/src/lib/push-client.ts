import { fetchPushConfig } from "@/lib/push-config";

/** VAPID public key (URL-safe base64) → PushManager applicationServerKey */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** iOS는 홈 화면 PWA만 푸시 가능. Android 등은 브라우저 탭도 가능 */
export function isPushContextOk(): boolean {
  if (!isIOS()) return true;
  return isStandalonePwa();
}

export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

async function getVapidPublicKey(): Promise<string | null> {
  const fromEnv = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (fromEnv) return fromEnv;
  const config = await fetchPushConfig();
  return config.vapidPublicKey;
}

export async function subscribeToPushNotifications(): Promise<boolean> {
  const vapidPublicKey = await getVapidPublicKey();
  if (!vapidPublicKey || !isPushSupported()) return false;
  if (!isPushContextOk()) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const reg = await navigator.serviceWorker.ready;
  let subscription = await reg.pushManager.getSubscription();

  if (!subscription) {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        vapidPublicKey
      ) as BufferSource,
    });
  }

  const res = await fetch(`${base}/api/push/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  });

  return res.ok;
}

/** 권한은 있으나 구독이 없을 때 서버에 다시 등록 */
export async function ensurePushSubscription(): Promise<boolean> {
  if (!isPushSupported() || Notification.permission !== "granted") {
    return false;
  }

  const vapidPublicKey = await getVapidPublicKey();
  if (!vapidPublicKey) return false;

  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const reg = await navigator.serviceWorker.ready;
  let subscription = await reg.pushManager.getSubscription();

  if (!subscription) {
    if (!isPushContextOk()) return false;
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        vapidPublicKey
      ) as BufferSource,
    });
  }

  const res = await fetch(`${base}/api/push/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  });

  return res.ok;
}

export async function hasActivePushSubscription(): Promise<boolean> {
  if (!isPushSupported() || Notification.permission !== "granted") {
    return false;
  }
  const reg = await navigator.serviceWorker.ready;
  return (await reg.pushManager.getSubscription()) != null;
}

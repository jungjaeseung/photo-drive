import {
  clearPushConfigCache,
  fetchPushConfig,
  getClientBasePath,
  getServiceWorkerScope,
} from "@/lib/push-config";

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

export const PUSH_PROMPT_OPEN_EVENT = "photo-drive-open-push-prompt";
export const SW_READY_EVENT = "photo-drive-sw-ready";

/** 동기 1차 검사 (iOS는 PushManager가 window에 없음) */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "Notification" in window
  );
}

/** serviceWorker.ready는 SW 미등록 시 iOS에서 무한 대기 → 타임아웃 필수 */
export async function getServiceWorkerRegistration(
  timeoutMs = 8000
): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;

  const scope = getServiceWorkerScope();

  try {
    const existing = await navigator.serviceWorker.getRegistration(scope);
    if (existing?.active && "pushManager" in existing) return existing;
  } catch {
    /* ignore */
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    navigator.serviceWorker.ready
      .then((reg) => {
        clearTimeout(timer);
        resolve(reg);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(null);
      });
  });
}

export async function ensureServiceWorkerRegistered(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const scope = getServiceWorkerScope();
  const base = getClientBasePath();
  try {
    const existing = await navigator.serviceWorker.getRegistration(scope);
    if (existing) return true;
    await navigator.serviceWorker.register(`${base}/sw.js`, { scope });
    return (await getServiceWorkerRegistration(10000)) != null;
  } catch {
    return false;
  }
}

/** SW의 pushManager 존재 여부 (iOS PWA 필수) */
export async function hasPushManager(): Promise<boolean> {
  const reg = await getServiceWorkerRegistration(5000);
  return reg != null && "pushManager" in reg;
}

/** SW 등록·활성화까지 대기 */
export async function waitForPushManager(timeoutMs = 12000): Promise<boolean> {
  if (!isPushSupported()) return false;
  await ensureServiceWorkerRegistered();
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await hasPushManager()) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
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
  if (!vapidPublicKey || !(await waitForPushManager())) return false;
  if (!isPushContextOk()) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const base = getClientBasePath();
  const reg = await getServiceWorkerRegistration();
  if (!reg) return false;
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
    signal: AbortSignal.timeout(8000),
  });

  return res.ok;
}

/** 권한은 있으나 구독이 없을 때 서버에 다시 등록 */
export async function ensurePushSubscription(): Promise<boolean> {
  if (Notification.permission !== "granted" || !(await waitForPushManager())) {
    return false;
  }

  const vapidPublicKey = await getVapidPublicKey();
  if (!vapidPublicKey) return false;

  const base = getClientBasePath();
  const reg = await getServiceWorkerRegistration();
  if (!reg) return false;
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
    signal: AbortSignal.timeout(8000),
  });

  return res.ok;
}

export async function hasActivePushSubscription(): Promise<boolean> {
  if (Notification.permission !== "granted" || !(await hasPushManager())) {
    return false;
  }
  const reg = await getServiceWorkerRegistration();
  if (!reg) return false;
  return (await reg.pushManager.getSubscription()) != null;
}

export type PushSetupState =
  | "unsupported"
  | "server_off"
  | "ios_browser"
  | "denied"
  | "ready"
  | "need_enable"
  | "need_reconnect";

/** 배너·종 버튼 표시 여부 판단용 */
export async function getPushSetupState(): Promise<PushSetupState> {
  if (!isPushSupported()) return "unsupported";

  const config = await fetchPushConfig();
  if (!config.enabled) return "server_off";

  if (!isPushContextOk()) return "ios_browser";

  const hasPm = await waitForPushManager(8000);
  if (!hasPm) {
    return isIOS() && !isStandalonePwa() ? "ios_browser" : "unsupported";
  }

  const permission = Notification.permission;
  if (permission === "denied") return "denied";
  if (permission === "granted") {
    if (await hasActivePushSubscription()) return "ready";
    return "need_reconnect";
  }
  return "need_enable";
}

export function openPushPrompt(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PUSH_PROMPT_OPEN_EVENT));
}

export function invalidatePushState(): void {
  clearPushConfigCache();
}

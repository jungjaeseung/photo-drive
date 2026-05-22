"use client";

import { Button } from "@/components/ui/button";
import {
  isPushSupported,
  isStandalonePwa,
  subscribeToPushNotifications,
  syncExistingPushSubscription,
} from "@/lib/push-client";
import { Bell, X } from "lucide-react";
import { useEffect, useState } from "react";

const DISMISS_KEY = "photo-drive-push-prompt-dismissed";

export function PwaPushSubscribe() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vapidConfigured = !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (!vapidConfigured || !isPushSupported()) return;

    const run = async () => {
      if (!("serviceWorker" in navigator)) return;
      try {
        await navigator.serviceWorker.ready;
      } catch {
        return;
      }

      if (Notification.permission === "granted") {
        await syncExistingPushSubscription();
        return;
      }

      if (Notification.permission !== "default") return;
      if (!isStandalonePwa()) return;
      if (localStorage.getItem(DISMISS_KEY) === "1") return;

      setVisible(true);
    };

    void run();
  }, [vapidConfigured]);

  async function handleEnable() {
    setBusy(true);
    setError(null);
    try {
      const ok = await subscribeToPushNotifications();
      if (ok) {
        setVisible(false);
      } else {
        setError("알림 권한이 필요합니다.");
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed left-4 right-4 z-40 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
      style={{ bottom: "calc(var(--fab-bottom, 5rem) + 4.5rem)" }}
      role="region"
      aria-label="업로드 완료 알림"
    >
      <div className="flex items-start gap-3">
        <Bell className="mt-0.5 h-5 w-5 shrink-0 text-pink-500" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">업로드 완료 알림</p>
          <p className="mt-1 text-xs text-zinc-500">
            처리가 끝나면 이 기기와 다른 홈 화면 앱에 알림을 보냅니다.
          </p>
          {error && (
            <p className="mt-2 text-xs text-red-500">{error}</p>
          )}
          <div className="mt-3 flex gap-2">
            <Button size="sm" disabled={busy} onClick={() => void handleEnable()}>
              {busy ? "설정 중…" : "알림 받기"}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              나중에
            </Button>
          </div>
        </div>
        <button
          type="button"
          aria-label="닫기"
          className="shrink-0 p-1 text-zinc-400"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { fetchPushConfig } from "@/lib/push-config";
import {
  ensurePushSubscription,
  hasActivePushSubscription,
  isIOS,
  isPushContextOk,
  isPushSupported,
  isStandalonePwa,
  subscribeToPushNotifications,
} from "@/lib/push-client";
import { Bell, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const DISMISS_KEY = "photo-drive-push-prompt-dismissed";

type PromptReason =
  | "enable"
  | "ios_home_screen"
  | "denied"
  | "reconnect"
  | null;

export function PwaPushSubscribe() {
  const [reason, setReason] = useState<PromptReason>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverEnabled, setServerEnabled] = useState<boolean | null>(null);

  const evaluate = useCallback(async () => {
    if (!isPushSupported()) {
      setReason(null);
      return;
    }

    const config = await fetchPushConfig();
    setServerEnabled(config.enabled);
    if (!config.enabled) {
      setReason(null);
      return;
    }

    try {
      await navigator.serviceWorker.ready;
    } catch {
      setReason(null);
      return;
    }

    if (!isPushContextOk()) {
      if (isIOS()) setReason("ios_home_screen");
      else setReason(null);
      return;
    }

    const permission = Notification.permission;

    if (permission === "denied") {
      setReason("denied");
      return;
    }

    if (permission === "granted") {
      const subscribed = await hasActivePushSubscription();
      if (subscribed) {
        await ensurePushSubscription();
        setReason(null);
        return;
      }
      setReason("reconnect");
      return;
    }

    if (localStorage.getItem(DISMISS_KEY) === "1") {
      setReason(null);
      return;
    }

    setReason("enable");
  }, []);

  useEffect(() => {
    void evaluate();
  }, [evaluate]);

  useEffect(() => {
    const onFocus = () => void evaluate();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [evaluate]);

  async function handleEnable() {
    setBusy(true);
    setError(null);
    try {
      const ok = await subscribeToPushNotifications();
      if (ok) {
        localStorage.removeItem(DISMISS_KEY);
        setReason(null);
      } else if (!isPushContextOk() && isIOS()) {
        setReason("ios_home_screen");
      } else {
        setError("알림 권한이 필요합니다.");
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
      void evaluate();
    }
  }

  async function handleReconnect() {
    setBusy(true);
    setError(null);
    try {
      const ok = await ensurePushSubscription();
      if (ok) setReason(null);
      else setError("구독에 실패했습니다. 알림 받기를 다시 시도해 주세요.");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  function handleDismiss() {
    if (reason === "enable") {
      localStorage.setItem(DISMISS_KEY, "1");
    }
    setReason(null);
  }

  if (reason === null) return null;

  const iosHint =
    "iPhone/iPad는 Safari 탭이 아니라 홈 화면에 추가한 앱에서만 푸시가 됩니다. 홈 화면 아이콘으로 열었는지 확인해 주세요.";

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
          {reason === "enable" && (
            <>
              <p className="text-sm font-medium">업로드 완료 알림</p>
              <p className="mt-1 text-xs text-zinc-500">
                처리가 끝나면 이 기기와 다른 홈 화면 앱에 알림을 보냅니다.
              </p>
            </>
          )}
          {reason === "reconnect" && (
            <>
              <p className="text-sm font-medium">알림 연결 필요</p>
              <p className="mt-1 text-xs text-zinc-500">
                알림은 허용되어 있지만 기기 등록이 없습니다. 한 번 연결해 주세요.
              </p>
            </>
          )}
          {reason === "ios_home_screen" && (
            <>
              <p className="text-sm font-medium">홈 화면 앱에서 열기</p>
              <p className="mt-1 text-xs text-zinc-500">{iosHint}</p>
              {!isStandalonePwa() && (
                <p className="mt-2 text-xs text-amber-600">
                  지금은 Safari/브라우저 탭으로 보고 있는 것 같습니다. 홈 화면
                  아이콘을 눌러 다시 열어 주세요. (다시 추가할 필요는 없습니다)
                </p>
              )}
            </>
          )}
          {reason === "denied" && (
            <>
              <p className="text-sm font-medium">알림이 차단됨</p>
              <p className="mt-1 text-xs text-zinc-500">
                {isIOS()
                  ? "설정 → 알림 → Photo Drive(또는 Safari)에서 알림을 켜 주세요."
                  : "브라우저 사이트 설정에서 알림을 허용해 주세요."}
              </p>
            </>
          )}
          {serverEnabled === false && (
            <p className="mt-2 text-xs text-amber-600">
              서버에 VAPID 키가 설정되지 않았습니다. 배포 환경 변수를 확인하세요.
            </p>
          )}
          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {(reason === "enable" || reason === "reconnect") && (
              <Button
                size="sm"
                disabled={busy}
                onClick={() =>
                  void (reason === "reconnect" ? handleReconnect() : handleEnable())
                }
              >
                {busy ? "설정 중…" : reason === "reconnect" ? "연결" : "알림 받기"}
              </Button>
            )}
            {reason === "enable" && (
              <Button size="sm" variant="ghost" onClick={handleDismiss}>
                나중에
              </Button>
            )}
            {(reason === "denied" || reason === "ios_home_screen") && (
              <Button size="sm" variant="ghost" onClick={() => void evaluate()}>
                다시 확인
              </Button>
            )}
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

"use client";

import { Button } from "@/components/ui/button";
import { fetchPushConfig } from "@/lib/push-config";
import {
  ensurePushSubscription,
  getPushSetupState,
  isIOS,
  isStandalonePwa,
  openPushPrompt,
  PUSH_PROMPT_OPEN_EVENT,
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
  | "unsupported"
  | null;

function stateToReason(
  state: Awaited<ReturnType<typeof getPushSetupState>>,
  bypassDismiss: boolean
): PromptReason {
  switch (state) {
    case "need_enable":
      if (!bypassDismiss && localStorage.getItem(DISMISS_KEY) === "1") {
        return null;
      }
      return "enable";
    case "need_reconnect":
      return "reconnect";
    case "ios_browser":
      return "ios_home_screen";
    case "denied":
      return "denied";
    case "unsupported":
      return isIOS() && !isStandalonePwa() ? "ios_home_screen" : "unsupported";
    default:
      return null;
  }
}

export function PwaPushSubscribe() {
  const [reason, setReason] = useState<PromptReason>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverEnabled, setServerEnabled] = useState<boolean | null>(null);
  const [forceOpen, setForceOpen] = useState(false);

  const evaluate = useCallback(
    async (opts?: { bypassDismiss?: boolean }) => {
      const bypass = opts?.bypassDismiss ?? forceOpen;
      const config = await fetchPushConfig();
      setServerEnabled(config.enabled);

      const state = await getPushSetupState();
      if (state === "ready") {
        await ensurePushSubscription();
        setReason(null);
        return;
      }

      setReason(stateToReason(state, bypass));
    },
    [forceOpen]
  );

  useEffect(() => {
    void evaluate();
  }, [evaluate]);

  useEffect(() => {
    const onOpen = () => {
      localStorage.removeItem(DISMISS_KEY);
      setForceOpen(true);
      void evaluate({ bypassDismiss: true });
    };
    window.addEventListener(PUSH_PROMPT_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(PUSH_PROMPT_OPEN_EVENT, onOpen);
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
        setForceOpen(false);
        setReason(null);
      } else {
        setError("알림 권한이 필요합니다.");
        void evaluate({ bypassDismiss: true });
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleReconnect() {
    setBusy(true);
    setError(null);
    try {
      const ok = await ensurePushSubscription();
      if (ok) {
        setForceOpen(false);
        setReason(null);
      } else {
        setError("구독에 실패했습니다. 알림 받기를 다시 시도해 주세요.");
      }
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
    setForceOpen(false);
    setReason(null);
  }

  if (reason === null) return null;

  const iosHint =
    "iPhone/iPad는 Safari 탭이 아니라 홈 화면에 추가한 앱에서만 푸시가 됩니다. 홈 화면 아이콘으로 열었는지 확인해 주세요.";

  return (
    <div
      className="fixed left-4 right-4 z-[60] rounded-xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
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
                  아이콘을 눌러 다시 열어 주세요.
                </p>
              )}
            </>
          )}
          {reason === "denied" && (
            <>
              <p className="text-sm font-medium">알림이 차단됨</p>
              <p className="mt-1 text-xs text-zinc-500">
                {isIOS()
                  ? "설정 → 알림 → Photo Drive에서 알림을 켜 주세요."
                  : "브라우저 사이트 설정에서 알림을 허용해 주세요."}
              </p>
            </>
          )}
          {reason === "unsupported" && (
            <>
              <p className="text-sm font-medium">푸시를 사용할 수 없음</p>
              <p className="mt-1 text-xs text-zinc-500">
                이 브라우저/버전에서는 Web Push가 지원되지 않습니다. iOS 16.4
                이상에서 홈 화면에 추가한 뒤 다시 시도해 주세요.
              </p>
            </>
          )}
          {serverEnabled === false && (
            <p className="mt-2 text-xs text-amber-600">
              서버에 VAPID 키가 설정되지 않았습니다.
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
            {(reason === "denied" ||
              reason === "ios_home_screen" ||
              reason === "unsupported") && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void evaluate({ bypassDismiss: true })}
              >
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

/** 헤더 등에서 수동으로 알림 설정 열기 */
export function PushNotifyButton({ className }: { className?: string }) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    void getPushSetupState().then((s) => {
      setHidden(s === "ready" || s === "server_off" || s === "unsupported");
    });
  }, []);

  if (hidden) return null;

  return (
    <button
      type="button"
      aria-label="업로드 알림 설정"
      className={className}
      onClick={() => openPushPrompt()}
    >
      <Bell className="h-5 w-5 text-pink-500" />
    </button>
  );
}

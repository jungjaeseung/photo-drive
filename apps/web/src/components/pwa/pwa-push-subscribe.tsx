"use client";

import { Button } from "@/components/ui/button";
import { fetchPushConfig } from "@/lib/push-config";
import {
  ensurePushSubscription,
  getPushSetupState,
  isIOS,
  subscribeToPushNotifications,
  SW_READY_EVENT,
} from "@/lib/push-client";
import { Bell, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const DISMISS_KEY = "photo-drive-push-prompt-dismissed";

type PromptReason = "enable" | "denied" | null;

function stateToReason(
  state: Awaited<ReturnType<typeof getPushSetupState>>
): PromptReason {
  if (state === "need_enable") {
    if (localStorage.getItem(DISMISS_KEY) === "1") return null;
    return "enable";
  }
  if (state === "denied") return "denied";
  return null;
}

export function PwaPushSubscribe() {
  const [reason, setReason] = useState<PromptReason>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const evaluate = useCallback(async () => {
    const config = await fetchPushConfig();
    if (!config.enabled) {
      setReason(null);
      return;
    }

    const state = await getPushSetupState();
    if (state === "ready") {
      await ensurePushSubscription();
      setReason(null);
      return;
    }

    setReason(stateToReason(state));
  }, []);

  useEffect(() => {
    void evaluate();
    const t = setTimeout(() => void evaluate(), 2000);
    return () => clearTimeout(t);
  }, [evaluate]);

  useEffect(() => {
    const onSwReady = () => void evaluate();
    const onFocus = () => void evaluate();
    window.addEventListener(SW_READY_EVENT, onSwReady);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener(SW_READY_EVENT, onSwReady);
      window.removeEventListener("focus", onFocus);
    };
  }, [evaluate]);

  async function handleEnable() {
    setBusy(true);
    setError(null);
    try {
      const ok = await subscribeToPushNotifications();
      if (ok) {
        localStorage.removeItem(DISMISS_KEY);
        setReason(null);
      } else {
        setError(
          "알림 등록에 실패했습니다. 홈 화면 앱에서 다시 시도하거나 설정 → 알림을 확인해 주세요."
        );
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
      void evaluate();
    }
  }

  function handleDismiss() {
    if (reason === "enable") {
      localStorage.setItem(DISMISS_KEY, "1");
    }
    setReason(null);
  }

  if (reason === null) return null;

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
          {reason === "denied" && (
            <>
              <p className="text-sm font-medium">알림이 꺼져 있음</p>
              <p className="mt-1 text-xs text-zinc-500">
                {isIOS()
                  ? "설정 → 알림 → Photo Drive에서 알림을 켜 주세요."
                  : "브라우저 사이트 설정에서 알림을 허용해 주세요."}
              </p>
            </>
          )}
          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {reason === "enable" && (
              <>
                <Button size="sm" disabled={busy} onClick={() => void handleEnable()}>
                  {busy ? "설정 중…" : "알림 받기"}
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDismiss}>
                  나중에
                </Button>
              </>
            )}
            {reason === "denied" && (
              <Button size="sm" variant="ghost" onClick={handleDismiss}>
                닫기
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

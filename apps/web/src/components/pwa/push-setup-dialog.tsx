"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { clearPushConfigCache, fetchPushConfig } from "@/lib/push-config";
import {
  isIOS,
  isPushContextOk,
  isPushSupported,
  isStandalonePwa,
  subscribeToPushNotifications,
  type PushSetupState,
  waitForPushManager,
} from "@/lib/push-client";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface PushSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Diag = {
  href: string;
  pathname: string;
  basePath: string;
  standalone: boolean;
  configEnabled: boolean;
  configError: string | null;
  pushState: PushSetupState;
  hasPushManager: boolean;
  loadError: string | null;
};

function buildSyncDiag(): Diag {
  const basePath =
    typeof window !== "undefined"
      ? (window.location.pathname.match(/^(\/photos)/)?.[1] ??
        "(없음 → /photos 아님)")
      : "-";

  return {
    href: typeof window !== "undefined" ? window.location.href : "-",
    pathname: typeof window !== "undefined" ? window.location.pathname : "-",
    basePath,
    standalone: isStandalonePwa(),
    configEnabled: false,
    configError: null,
    pushState: "unsupported",
    hasPushManager: false,
    loadError: null,
  };
}

async function loadPushDiag(): Promise<Diag> {
  const diag = buildSyncDiag();

  try {
    const config = await fetchPushConfig();
    diag.configEnabled = config.enabled;
    if (!config.enabled) {
      diag.configError = "enabled=false (서버 VAPID 확인)";
    }
  } catch (e) {
    diag.configError = String(e);
  }

  if (!isPushSupported()) {
    diag.pushState = "unsupported";
    return diag;
  }

  if (!diag.configEnabled) {
    diag.pushState = "server_off";
    return diag;
  }

  if (!isPushContextOk()) {
    diag.pushState = "ios_browser";
    return diag;
  }

  diag.hasPushManager = await waitForPushManager(4000);
  if (!diag.hasPushManager) {
    diag.pushState = "unsupported";
    diag.loadError = "Service Worker / pushManager 준비 안 됨";
    return diag;
  }

  const permission = Notification.permission;
  if (permission === "denied") {
    diag.pushState = "denied";
    return diag;
  }

  if (permission === "granted") {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      diag.pushState = sub ? "ready" : "need_reconnect";
    } catch (e) {
      diag.pushState = "need_reconnect";
      diag.loadError = String(e);
    }
    return diag;
  }

  diag.pushState = "need_enable";
  return diag;
}

export function PushSetupDialog({ open, onOpenChange }: PushSetupDialogProps) {
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diag, setDiag] = useState<Diag | null>(null);

  const refresh = useCallback(async () => {
    if (typeof window === "undefined") return;

    setLoading(true);
    setError(null);
    setDiag(buildSyncDiag());

    try {
      clearPushConfigCache();
      const next = await loadPushDiag();
      setDiag(next);
    } catch (e) {
      const fallback = buildSyncDiag();
      fallback.loadError = String(e);
      setDiag(fallback);
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  async function handleEnable() {
    setBusy(true);
    setError(null);
    try {
      const ok = await subscribeToPushNotifications();
      if (ok) {
        onOpenChange(false);
      } else {
        setError("구독에 실패했습니다. 아래 상태를 확인해 주세요.");
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
      void refresh();
    }
  }

  const showEnable =
    diag != null &&
    diag.pushState !== "ready" &&
    diag.pushState !== "server_off";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!inset-auto !left-1/2 !top-1/2 !z-[110] !h-auto !max-h-[85vh] !w-[min(100%,22rem)] !-translate-x-1/2 !-translate-y-1/2 !flex-none overflow-y-auto rounded-xl bg-zinc-900 p-4 text-white">
        <DialogTitle className="text-base font-semibold">업로드 완료 알림</DialogTitle>

        <p className="mt-2 text-xs text-zinc-400">
          iPhone은 홈 화면에 추가한 앱에서만 푸시가 됩니다. 아래 「현재 주소」에
          /photos 가 있어야 합니다.
        </p>

        {loading && (
          <p className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            상태 확인 중…
          </p>
        )}

        {diag && (
          <dl className="mt-3 space-y-2 rounded-lg bg-zinc-950 p-3 text-[11px] text-zinc-300">
            <div>
              <dt className="text-zinc-500">현재 주소</dt>
              <dd className="break-all font-mono">{diag.href}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">경로 (pathname)</dt>
              <dd className="font-mono">{diag.pathname}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">/photos 사용</dt>
              <dd>
                {diag.basePath === "/photos" ? (
                  <span className="text-green-400">예</span>
                ) : (
                  <span className="text-amber-400">아니오 ({diag.basePath})</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">홈 화면 앱 (standalone)</dt>
              <dd>{diag.standalone ? "예" : "아니오"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">서버 푸시 설정</dt>
              <dd>
                {diag.configEnabled ? (
                  <span className="text-green-400">켜짐</span>
                ) : (
                  <span className="text-amber-400">
                    꺼짐{diag.configError ? ` — ${diag.configError}` : ""}
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">pushManager</dt>
              <dd>{diag.hasPushManager ? "있음" : "없음"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">이 기기 상태</dt>
              <dd className="font-mono">{diag.pushState}</dd>
            </div>
            {diag.loadError && (
              <div>
                <dt className="text-zinc-500">오류</dt>
                <dd className="text-red-400">{diag.loadError}</dd>
              </div>
            )}
          </dl>
        )}

        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

        {diag?.pushState === "ios_browser" && isIOS() && (
          <p className="mt-2 text-xs text-amber-400">
            Safari 탭이 아니라 Photo Drive 홈 화면 아이콘으로 연 뒤 다시 여세요.
          </p>
        )}

        {diag?.pushState === "denied" && (
          <p className="mt-2 text-xs text-amber-400">
            설정 → 알림 → Photo Drive에서 알림을 허용한 뒤 「상태 새로고침」을
            누르세요.
          </p>
        )}

        {diag?.pushState === "server_off" && (
          <p className="mt-2 text-xs text-amber-400">
            서버 VAPID 환경 변수가 없습니다. docker compose build 전에 export
            필요합니다.
          </p>
        )}

        {diag?.pushState === "ready" && (
          <p className="mt-2 text-xs text-green-400">
            이 기기는 알림 등록이 완료된 상태입니다.
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {showEnable && (
            <Button size="sm" disabled={busy || loading} onClick={() => void handleEnable()}>
              {busy ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  설정 중…
                </>
              ) : (
                "알림 받기"
              )}
            </Button>
          )}
          {diag?.pushState === "denied" && (
            <Button
              size="sm"
              variant="secondary"
              disabled={busy || loading}
              onClick={() => void handleEnable()}
            >
              다시 허용 요청
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            disabled={loading}
            onClick={() => void refresh()}
          >
            {loading ? "확인 중…" : "상태 새로고침"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

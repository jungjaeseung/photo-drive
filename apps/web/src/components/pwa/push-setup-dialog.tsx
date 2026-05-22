"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { clearPushConfigCache, fetchPushConfig } from "@/lib/push-config";
import {
  getPushSetupState,
  isIOS,
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

export function PushSetupDialog({ open, onOpenChange }: PushSetupDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diag, setDiag] = useState<{
    href: string;
    pathname: string;
    basePath: string;
    standalone: boolean;
    configEnabled: boolean;
    configError: string | null;
    pushState: PushSetupState | null;
    hasPushManager: boolean;
  } | null>(null);

  const refresh = useCallback(async () => {
    if (typeof window === "undefined") return;

    clearPushConfigCache();
    const basePath =
      window.location.pathname.match(/^(\/photos)/)?.[1] ?? "(없음 → /photos 아님)";

    let configEnabled = false;
    let configError: string | null = null;
    try {
      const config = await fetchPushConfig();
      configEnabled = config.enabled;
      if (!config.enabled) configError = "enabled=false 또는 API 실패";
    } catch (e) {
      configError = String(e);
    }

    const pushState = isPushSupported()
      ? await getPushSetupState()
      : "unsupported";

    setDiag({
      href: window.location.href,
      pathname: window.location.pathname,
      basePath,
      standalone: isStandalonePwa(),
      configEnabled,
      configError,
      pushState,
      hasPushManager: await waitForPushManager(3000),
    });
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
    diag?.pushState === "need_enable" ||
    diag?.pushState === "need_reconnect" ||
    diag?.pushState === "ios_browser";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!inset-auto !left-1/2 !top-1/2 !h-auto !max-h-[85vh] !w-[min(100%,22rem)] !-translate-x-1/2 !-translate-y-1/2 !flex-none overflow-y-auto rounded-xl bg-zinc-900 p-4 text-white">
        <DialogTitle className="text-base font-semibold">업로드 완료 알림</DialogTitle>

        <p className="mt-2 text-xs text-zinc-400">
          iPhone은 홈 화면에 추가한 앱에서만 푸시가 됩니다. 주소창이 없어도 아래
          「현재 주소」로 /photos 인지 확인할 수 있습니다.
        </p>

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
              <dd>{diag.hasPushManager ? "있음" : "없음 (SW 대기 중일 수 있음)"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">이 기기 상태</dt>
              <dd className="font-mono">{diag.pushState ?? "-"}</dd>
            </div>
          </dl>
        )}

        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

        {diag?.pushState === "ios_browser" && isIOS() && (
          <p className="mt-2 text-xs text-amber-400">
            Safari 탭이 아니라 Photo Drive 홈 화면 아이콘으로 연 뒤, 이 창을 다시
            여세요.
          </p>
        )}

        {diag?.pushState === "denied" && (
          <p className="mt-2 text-xs text-amber-400">
            설정 → 알림 → Photo Drive에서 알림을 허용해 주세요.
          </p>
        )}

        {diag?.pushState === "ready" && (
          <p className="mt-2 text-xs text-green-400">
            이 기기는 알림 등록이 완료된 상태입니다.
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {showEnable && (
            <Button size="sm" disabled={busy} onClick={() => void handleEnable()}>
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
          <Button size="sm" variant="ghost" onClick={() => void refresh()}>
            상태 새로고침
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

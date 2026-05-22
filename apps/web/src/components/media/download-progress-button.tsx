"use client";

import { Button } from "@/components/ui/button";
import { formatBytes, type DownloadProgress } from "@/lib/download-zip";
import { cn } from "@/lib/utils";
import { Download, Loader2 } from "lucide-react";

export function downloadProgressLabel(progress: DownloadProgress): string {
  const partPrefix =
    progress.totalParts && progress.totalParts > 1
      ? `${progress.part ?? 1}/${progress.totalParts} `
      : "";
  if (progress.phase === "compressing") {
    return `${partPrefix}압축 중…`;
  }
  if (progress.percent != null) {
    return `${partPrefix}${progress.percent}%`;
  }
  return `${partPrefix}${formatBytes(progress.loaded)}`;
}

interface DownloadProgressButtonProps {
  progress: DownloadProgress | null;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  className?: string;
}

/** 선택 모드·앨범 설정 공통 ZIP 다운로드 버튼 (진행 시 막대 + 퍼센트) */
export function DownloadProgressButton({
  progress,
  onClick,
  disabled = false,
  title = "원본 ZIP 다운로드",
  className,
}: DownloadProgressButtonProps) {
  const downloading = progress !== null;

  return (
    <Button
      size={downloading ? "default" : "icon"}
      className={cn(
        "shadow-lg",
        downloading && "h-10 min-w-[7.5rem] w-auto gap-2 px-3 transition-[width]",
        className
      )}
      disabled={disabled || downloading}
      onClick={onClick}
      title={title}
    >
      {downloading && progress ? (
        <>
          <div className="h-1.5 min-w-[3.5rem] flex-1 overflow-hidden rounded-full bg-white/30">
            {progress.phase === "compressing" || progress.percent == null ? (
              <div className="h-full w-full animate-pulse rounded-full bg-white/70" />
            ) : (
              <div
                className="h-full rounded-full bg-white transition-[width] duration-150"
                style={{ width: `${progress.percent}%` }}
              />
            )}
          </div>
          <span className="shrink-0 text-xs tabular-nums">
            {downloadProgressLabel(progress)}
          </span>
        </>
      ) : (
        <Download className="h-5 w-5" />
      )}
    </Button>
  );
}

/** 다운로드 중 카드·소형 버튼용 스피너 */
export function DownloadProgressSpinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin", className)} />;
}

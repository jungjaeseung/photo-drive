"use client";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import type { UploadQueueItem } from "@/hooks/use-upload-queue";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react";

interface UploadDrawerProps {
  items: UploadQueueItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeCount: number;
  totalCount: number;
}

function statusLabel(item: UploadQueueItem): string {
  switch (item.status) {
    case "pending":
      return "대기중";
    case "uploading":
    case "processing":
      return "업로드중";
    case "complete":
      return "완료";
    case "error":
      return "오류";
    default:
      return "";
  }
}

function StatusIcon({ item }: { item: UploadQueueItem }) {
  switch (item.status) {
    case "pending":
      return <Clock className="h-4 w-4 shrink-0 text-zinc-400" />;
    case "uploading":
    case "processing":
      return (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-500" />
      );
    case "complete":
      return (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
      );
    case "error":
      return <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />;
    default:
      return null;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadDrawer({
  items,
  open,
  onOpenChange,
  activeCount,
  totalCount,
}: UploadDrawerProps) {
  const summary =
    activeCount > 0
      ? `${activeCount}개 진행 중 · 전체 ${totalCount}개`
      : totalCount > 0
        ? `전체 ${totalCount}개`
        : "";

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="pb-[calc(var(--fab-bottom,1rem)+0.5rem)]">
        <DrawerHeader className="text-left">
          <DrawerTitle>업로드</DrawerTitle>
          {summary ? (
            <DrawerDescription>{summary}</DrawerDescription>
          ) : null}
        </DrawerHeader>

        <ul className="max-h-[50vh] overflow-y-auto px-4 pb-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="border-b border-zinc-100 py-3 last:border-0 dark:border-zinc-800"
            >
              <div className="flex items-start gap-3">
                <StatusIcon item={item} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {item.fileName}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {statusLabel(item)}
                    {item.fileSize > 0 && (
                      <span className="ml-1.5">
                        · {formatFileSize(item.fileSize)}
                      </span>
                    )}
                    {item.errorMessage ? (
                      <span className="ml-1.5 text-red-500">
                        · {item.errorMessage}
                      </span>
                    ) : null}
                  </p>
                  {item.status === "uploading" &&
                  item.progress != null &&
                  item.progress >= 0 ? (
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-[width] duration-150"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  ) : item.status === "processing" ? (
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                      <div className="h-full w-full animate-pulse rounded-full bg-blue-500/60" />
                    </div>
                  ) : null}
                </div>
                {item.status === "uploading" && item.progress != null ? (
                  <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                    {item.progress}%
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </DrawerContent>
    </Drawer>
  );
}

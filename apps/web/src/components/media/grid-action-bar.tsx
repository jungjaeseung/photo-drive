"use client";

import { AlbumPickerDialog } from "@/components/media/album-picker-dialog";
import { UploadDrawer } from "@/components/media/upload-drawer";
import { Button } from "@/components/ui/button";
import type { MediaGridItem } from "@/components/media/media-grid";
import type { GridMode } from "@/hooks/use-grid-mode";
import { useUploadQueue } from "@/hooks/use-upload-queue";
import { DownloadProgressButton } from "@/components/media/download-progress-button";
import { downloadMediaAsZip, type DownloadProgress } from "@/lib/download-zip";
import { removeMediaFromAlbums } from "@/lib/album-media";
import { cn } from "@/lib/utils";
import {
  FolderMinus,
  Loader2,
  Share2,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";

interface GridActionBarProps {
  mode: GridMode;
  onModeChange: (mode: GridMode) => void;
  selectedIds: Set<string>;
  showUpload?: boolean;
  /** 앨범 상세 페이지: 선택 항목을 현재 앨범에서 제거 */
  albumId?: string;
  onUploaded?: () => void;
  /** 파일별 업로드 직후 그리드에 처리 중 항목 표시 */
  onItemUploaded?: (item: MediaGridItem) => void;
  onAlbumAdded?: () => void;
  onRemovedFromAlbum?: () => void;
  /** 선택 항목 영구 삭제 후 목록 갱신 */
  onDeleted?: () => void;
}

export function GridActionBar({
  mode,
  onModeChange,
  selectedIds,
  showUpload = true,
  albumId,
  onUploaded,
  onItemUploaded,
  onAlbumAdded,
  onRemovedFromAlbum,
  onDeleted,
}: GridActionBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    items: uploadItems,
    enqueue,
    isActive: uploadActive,
    drawerOpen,
    setDrawerOpen,
    openDrawer,
    activeCount,
    totalCount,
  } = useUploadQueue({ onItemUploaded, onUploaded });
  const uploadError = uploadItems.find((i) => i.status === "error")?.errorMessage ?? null;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] =
    useState<DownloadProgress | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const downloading = downloadProgress !== null;

  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const hasSelection = selectedIds.size > 0;

  function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    enqueue(Array.from(files));
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleUploadButtonClick() {
    if (uploadActive) {
      openDrawer();
      return;
    }
    inputRef.current?.click();
  }

  async function handleDownloadZip() {
    if (!hasSelection) return;
    setDownloadError(null);
    setDownloadProgress({
      phase: "compressing",
      loaded: 0,
      total: null,
      percent: null,
    });
    try {
      await downloadMediaAsZip(Array.from(selectedIds), setDownloadProgress);
    } catch (e) {
      setDownloadError(String(e));
    } finally {
      setDownloadProgress(null);
    }
  }

  async function handleDeleteSelected() {
    if (!hasSelection) return;
    if (
      !confirm(
        `선택한 ${selectedIds.size}개 항목을 삭제할까요?\n(보관함·앨범에서 모두 제거됩니다)`
      )
    ) {
      return;
    }

    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`${base}/api/media/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaIds: Array.from(selectedIds) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "삭제 실패");
      }
      onDeleted?.();
      onModeChange("detail");
    } catch (e) {
      setDeleteError(String(e));
    } finally {
      setDeleting(false);
    }
  }

  async function handleRemoveFromAlbum() {
    if (!albumId || !hasSelection) return;
    if (
      !confirm(
        `선택한 ${selectedIds.size}개 항목을 이 앨범에서 제거할까요?\n(파일은 보관함에 남습니다)`
      )
    ) {
      return;
    }

    setRemoving(true);
    setRemoveError(null);
    try {
      await removeMediaFromAlbums(albumId, Array.from(selectedIds));
      onRemovedFromAlbum?.();
      onModeChange("detail");
    } catch (e) {
      setRemoveError(String(e));
    } finally {
      setRemoving(false);
    }
  }

  return (
    <>
      <div className="bottom-above-nav fixed right-4 z-50 flex items-end gap-2">
        <div className="flex shrink-0 rounded-full border border-zinc-200/80 bg-white/95 p-0.5 shadow-lg backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95">
          <button
            type="button"
            onClick={() => onModeChange("detail")}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              mode === "detail"
                ? "bg-blue-500 text-white"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            )}
          >
            자세히 보기
          </button>
          <button
            type="button"
            onClick={() => onModeChange("select")}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              mode === "select"
                ? "bg-blue-500 text-white"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            )}
          >
            선택 모드
          </button>
        </div>

        {mode === "detail" && showUpload && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <Button
              size="icon"
              className="shadow-lg"
              onClick={handleUploadButtonClick}
              title={uploadActive ? "업로드 진행 보기" : "파일 업로드"}
            >
              {uploadActive ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Upload className="h-5 w-5" />
              )}
            </Button>
          </>
        )}

        {mode === "select" && (
          <div className="flex flex-col items-end gap-2">
            <Button
              size="icon"
              variant="destructive"
              className="shadow-lg"
              disabled={!hasSelection || deleting}
              onClick={handleDeleteSelected}
              title="선택 항목 삭제"
            >
              {deleting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Trash2 className="h-5 w-5" />
              )}
            </Button>
            <DownloadProgressButton
              progress={downloadProgress}
              disabled={!hasSelection}
              onClick={handleDownloadZip}
            />
            {albumId && (
              <Button
                size="icon"
                variant="secondary"
                className="shadow-lg"
                disabled={!hasSelection || removing}
                onClick={handleRemoveFromAlbum}
                title="앨범에서 제거"
              >
                {removing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <FolderMinus className="h-5 w-5" />
                )}
              </Button>
            )}
            <Button
              size="icon"
              className="shadow-lg"
              disabled={!hasSelection}
              onClick={() => setPickerOpen(true)}
              title="앨범에 추가"
            >
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>

      {(uploadError || removeError || downloadError || deleteError) && (
        <p
          className="fixed right-4 z-50 max-w-[220px] rounded bg-red-500/90 px-2 py-1 text-xs text-white"
          style={{ bottom: "calc(var(--fab-bottom) + 4.5rem)" }}
        >
          {uploadError ?? removeError ?? downloadError ?? deleteError}
        </p>
      )}

      <UploadDrawer
        items={uploadItems}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        activeCount={activeCount}
        totalCount={totalCount}
      />

      <AlbumPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        mediaIds={Array.from(selectedIds)}
        onDone={() => {
          onAlbumAdded?.();
          onModeChange("detail");
        }}
      />
    </>
  );
}

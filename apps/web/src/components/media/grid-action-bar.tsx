"use client";

import { AlbumPickerDialog } from "@/components/media/album-picker-dialog";
import { Button } from "@/components/ui/button";
import type { GridMode } from "@/hooks/use-grid-mode";
import { removeMediaFromAlbums } from "@/lib/album-media";
import { cn } from "@/lib/utils";
import { FolderMinus, Loader2, Share2, Upload } from "lucide-react";
import { useRef, useState } from "react";

interface GridActionBarProps {
  mode: GridMode;
  onModeChange: (mode: GridMode) => void;
  selectedIds: Set<string>;
  showUpload?: boolean;
  /** 앨범 상세 페이지: 선택 항목을 현재 앨범에서 제거 */
  albumId?: string;
  onUploaded?: () => void;
  onAlbumAdded?: () => void;
  onRemovedFromAlbum?: () => void;
}

export function GridActionBar({
  mode,
  onModeChange,
  selectedIds,
  showUpload = true,
  albumId,
  onUploaded,
  onAlbumAdded,
  onRemovedFromAlbum,
}: GridActionBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const hasSelection = selectedIds.size > 0;

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setUploadError(null);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        if (file.lastModified > 0) {
          formData.append("fileLastModified", String(file.lastModified));
        }
        const res = await fetch(`${base}/api/media/upload`, {
          method: "POST",
          body: formData,
        });
        if (res.status === 409) continue;
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "upload failed");
        }
      }
      onUploaded?.();
    } catch (e) {
      setUploadError(String(e));
    } finally {
      setUploading(false);
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
      <div className="bottom-above-nav fixed right-4 z-50 flex items-center gap-2">
        <div className="flex rounded-full border border-zinc-200/80 bg-white/95 p-0.5 shadow-lg backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95">
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
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Upload className="h-5 w-5" />
              )}
            </Button>
          </>
        )}

        {mode === "select" && (
          <div className="flex flex-col gap-2">
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

      {(uploadError || removeError) && (
        <p
          className="fixed right-4 z-50 max-w-[220px] rounded bg-red-500/90 px-2 py-1 text-xs text-white"
          style={{ bottom: "calc(var(--fab-bottom) + 4.5rem)" }}
        >
          {uploadError ?? removeError}
        </p>
      )}

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

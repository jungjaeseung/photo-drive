"use client";

import { AlbumPickerDialog } from "@/components/media/album-picker-dialog";
import { Button } from "@/components/ui/button";
import type { GridMode } from "@/hooks/use-grid-mode";
import { cn } from "@/lib/utils";
import { Share2, Upload } from "lucide-react";
import { useRef, useState } from "react";

interface GridActionBarProps {
  mode: GridMode;
  onModeChange: (mode: GridMode) => void;
  selectedIds: Set<string>;
  showUpload?: boolean;
  onUploaded?: () => void;
  onAlbumAdded?: () => void;
}

export function GridActionBar({
  mode,
  onModeChange,
  selectedIds,
  showUpload = true,
  onUploaded,
  onAlbumAdded,
}: GridActionBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

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

  return (
    <>
      <div className="fixed bottom-20 right-4 z-30 flex items-center gap-2">
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
              <Upload className="h-5 w-5" />
            </Button>
          </>
        )}

        {mode === "select" && (
          <Button
            size="icon"
            className="shadow-lg"
            disabled={selectedIds.size === 0}
            onClick={() => setPickerOpen(true)}
          >
            <Share2 className="h-5 w-5" />
          </Button>
        )}
      </div>

      {uploadError && (
        <p className="fixed bottom-32 right-4 z-30 max-w-[200px] rounded bg-red-500/90 px-2 py-1 text-xs text-white">
          {uploadError}
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

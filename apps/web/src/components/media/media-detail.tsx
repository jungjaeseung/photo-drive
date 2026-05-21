"use client";

import { AlbumPickerDialog } from "@/components/media/album-picker-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { MediaNavItem } from "@/lib/media-nav-context";
import {
  ChevronLeft,
  ChevronRight,
  CloudDownload,
  Download,
  FolderPlus,
} from "lucide-react";
import { isOriginalUrlCached } from "@/lib/media-prefetch";
import { useCallback, useEffect, useRef, useState } from "react";

export interface MediaDetailData {
  id: string;
  type: "image" | "video";
  status: string;
  filename: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  originalUrl?: string;
  posterUrl?: string;
  videoPreviewUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
}

interface MediaDetailProps {
  media: MediaDetailData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: () => void;
  navItems?: MediaNavItem[];
  currentIndex?: number;
  onNavigate?: (id: string) => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export function MediaDetail({
  media,
  open,
  onOpenChange,
  onDelete,
  navItems = [],
  currentIndex = -1,
  onNavigate,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
}: MediaDetailProps) {
  const [originalLoaded, setOriginalLoaded] = useState(false);
  const [originalLoading, setOriginalLoading] = useState(false);
  const [albumPickerOpen, setAlbumPickerOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  const previewSrc = media.previewUrl ?? media.thumbnailUrl;
  const isImage = media.type === "image";

  useEffect(() => {
    setOriginalLoaded(false);
    setOriginalLoading(false);
    if (!isImage || !media.originalUrl) return;

    if (isOriginalUrlCached(media.originalUrl)) {
      setOriginalLoaded(true);
      return;
    }

    setOriginalLoading(true);
    const img = new Image();
    img.onload = () => {
      setOriginalLoaded(true);
      setOriginalLoading(false);
    };
    img.onerror = () => setOriginalLoading(false);
    img.src = media.originalUrl;
  }, [media.id, media.originalUrl, isImage]);

  const displaySrc =
    isImage && originalLoaded && media.originalUrl
      ? media.originalUrl
      : previewSrc;

  const handleSave = useCallback(() => {
    const url = media.originalUrl ?? media.previewUrl;
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = media.filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [media]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (diff > 60 && hasPrev) onPrev?.();
    if (diff < -60 && hasNext) onNext?.();
    touchStartX.current = null;
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && hasPrev) onPrev?.();
      if (e.key === "ArrowRight" && hasNext) onNext?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, hasPrev, hasNext, onPrev, onNext]);

  useEffect(() => {
    const el = stripRef.current;
    if (!el || currentIndex < 0) return;
    const thumb = el.children[currentIndex] as HTMLElement | undefined;
    thumb?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [currentIndex, media.id]);

  const stripWindow = 5;
  const stripStart = Math.max(0, currentIndex - stripWindow);
  const stripEnd = Math.min(navItems.length, currentIndex + stripWindow + 1);
  const visibleStrip = navItems.slice(stripStart, stripEnd);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col">
        <div
          className="relative flex flex-1 flex-col items-center justify-center overflow-hidden p-4 pt-12"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {originalLoading && isImage && (
            <div className="absolute top-14 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-xs text-white">
              <CloudDownload className="h-4 w-4 animate-pulse" />
              <span>원본 불러오는 중</span>
            </div>
          )}

          {hasPrev && (
            <button
              type="button"
              aria-label="이전"
              onClick={onPrev}
              className="absolute left-2 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60 lg:flex"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}
          {hasNext && (
            <button
              type="button"
              aria-label="다음"
              onClick={onNext}
              className="absolute right-2 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60 lg:flex"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}

          {media.type === "video" ? (
            <video
              key={media.id}
              src={media.originalUrl ?? media.videoPreviewUrl}
              poster={media.posterUrl ?? media.thumbnailUrl}
              controls
              playsInline
              preload={
                isOriginalUrlCached(media.originalUrl)
                  ? "auto"
                  : "metadata"
              }
              className="max-h-[55vh] max-w-full lg:max-h-[60vh]"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${media.id}-${displaySrc}`}
              src={displaySrc}
              alt={media.filename}
              className="max-h-[55vh] max-w-full object-contain transition-opacity duration-300 lg:max-h-[60vh]"
            />
          )}
        </div>

        {navItems.length > 1 && currentIndex >= 0 && (
          <div
            ref={stripRef}
            className="flex gap-1 overflow-x-auto border-t border-zinc-800 px-2 py-2"
          >
            {visibleStrip.map((item) => {
              const isCurrent = item.id === media.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate?.(item.id)}
                  className={cn(
                    "relative h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 transition-all",
                    isCurrent
                      ? "border-blue-500 opacity-100"
                      : "border-transparent opacity-60 hover:opacity-90"
                  )}
                >
                  {item.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-zinc-700" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-zinc-800 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{media.filename}</p>
            {media.width && media.height && (
              <p className="text-xs text-zinc-400">
                {media.width}×{media.height}
                {navItems.length > 1 && currentIndex >= 0 && (
                  <span className="ml-2 text-zinc-500">
                    {currentIndex + 1} / {navItems.length}
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {media.id && media.status !== "processing" && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setAlbumPickerOpen(true)}
              >
                <FolderPlus className="h-4 w-4" />
                앨범 추가
              </Button>
            )}
            {(media.originalUrl || media.previewUrl) && (
              <Button size="sm" variant="secondary" onClick={handleSave}>
                <Download className="h-4 w-4" />
                저장
              </Button>
            )}
            {onDelete && (
              <Button size="sm" variant="destructive" onClick={onDelete}>
                삭제
              </Button>
            )}
          </div>
        </div>
      </DialogContent>

      <AlbumPickerDialog
        open={albumPickerOpen}
        onOpenChange={setAlbumPickerOpen}
        mediaIds={media.id ? [media.id] : []}
      />
    </Dialog>
  );
}

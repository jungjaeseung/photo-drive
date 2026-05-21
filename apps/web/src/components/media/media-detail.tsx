"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useState } from "react";

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
}

export function MediaDetail({
  media,
  open,
  onOpenChange,
  onDelete,
}: MediaDetailProps) {
  const [showOriginal, setShowOriginal] = useState(false);

  const imageSrc =
    showOriginal && media.originalUrl
      ? media.originalUrl
      : media.previewUrl ?? media.thumbnailUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <div className="flex flex-1 flex-col items-center justify-center p-4 pt-12">
          {media.type === "video" ? (
            <video
              src={media.videoPreviewUrl ?? media.originalUrl}
              poster={media.posterUrl ?? media.thumbnailUrl}
              controls
              className="max-h-[70vh] max-w-full"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc}
              alt={media.filename}
              className="max-h-[70vh] max-w-full object-contain"
            />
          )}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-zinc-800 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{media.filename}</p>
            {media.width && media.height && (
              <p className="text-xs text-zinc-400">
                {media.width}×{media.height}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {media.type === "image" && media.originalUrl && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowOriginal(!showOriginal)}
              >
                {showOriginal ? "미리보기" : "원본"}
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
    </Dialog>
  );
}

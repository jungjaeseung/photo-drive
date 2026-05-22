"use client";

import {
  MediaDetail,
  type MediaDetailData,
} from "@/components/media/media-detail";
import type { MediaViewer } from "@/hooks/use-media-viewer";
import { invalidatePrefetchedMedia } from "@/lib/media-prefetch";
import { useEffect, useRef } from "react";

interface MediaViewerLayerProps {
  viewer: MediaViewer;
  onDeleted?: () => void;
  onFavoritedChange?: (mediaId: string, favorited: boolean) => void;
  albumId?: string;
  albumCoverMediaId?: string;
  onAlbumCoverChange?: (coverMediaId: string) => void;
}

export function MediaViewerLayer({
  viewer,
  onDeleted,
  onFavoritedChange,
  albumId,
  albumCoverMediaId,
  onAlbumCoverChange,
}: MediaViewerLayerProps) {
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!viewer.open) {
      pushedRef.current = false;
      return;
    }

    if (!pushedRef.current) {
      window.history.pushState({ mediaViewer: true }, "");
      pushedRef.current = true;
    }

    const onPopState = () => {
      viewer.close();
      pushedRef.current = false;
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [viewer.open, viewer.close]);

  async function handleDelete() {
    if (!viewer.selectedId) return;
    if (!confirm("이 미디어를 삭제할까요?")) return;

    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    const deletedId = viewer.selectedId;
    const nextTarget = viewer.nextId ?? viewer.prevId;

    await fetch(`${base}/api/media/${deletedId}`, { method: "DELETE" });
    invalidatePrefetchedMedia(deletedId);
    viewer.removeItem(deletedId);

    if (nextTarget) {
      viewer.select(nextTarget);
    } else {
      viewer.close();
    }
    onDeleted?.();
  }

  async function handleSetAlbumCover() {
    if (!albumId || !viewer.selectedId) return;
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    try {
      const res = await fetch(`${base}/api/albums/${albumId}/cover`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId: viewer.selectedId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "썸네일 지정 실패");
      }
      onAlbumCoverChange?.(viewer.selectedId);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  }

  const displayMedia: MediaDetailData | null =
    viewer.media ??
    (viewer.loading
      ? {
          id: viewer.selectedId ?? "",
          type: "image",
          status: "processing",
          filename: "불러오는 중…",
        }
      : null);

  if (!displayMedia) return null;

  return (
    <MediaDetail
      media={displayMedia}
      open={viewer.open}
      onOpenChange={(open) => {
        if (!open) {
          if (pushedRef.current) {
            window.history.back();
          } else {
            viewer.close();
          }
        }
      }}
      onDelete={viewer.media ? handleDelete : undefined}
      albumId={albumId}
      albumCoverMediaId={albumCoverMediaId}
      onSetAlbumCover={
        albumId && viewer.media ? handleSetAlbumCover : undefined
      }
      navItems={viewer.items}
      currentIndex={viewer.index}
      onNavigate={viewer.goTo}
      onPrev={viewer.goPrev}
      onNext={viewer.goNext}
      hasPrev={viewer.hasNav && !!viewer.prevId}
      hasNext={viewer.hasNav && !!viewer.nextId}
      onFavoritedChange={onFavoritedChange}
    />
  );
}

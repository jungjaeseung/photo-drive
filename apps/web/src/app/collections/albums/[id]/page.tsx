"use client";

import { GridActionBar } from "@/components/media/grid-action-bar";
import { MediaGrid } from "@/components/media/media-grid";
import { MediaViewerLayer } from "@/components/media/media-viewer-layer";
import { useMediaGridInteraction } from "@/hooks/use-media-grid-interaction";
import { useMediaViewer } from "@/hooks/use-media-viewer";
import { useMediaList } from "@/hooks/use-media-list";
import { X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function AlbumDetailPage() {
  const params = useParams();
  const albumId = params.id as string;
  const { items, loading, hasMore, loadMore, refresh, loadItemsForDateKey } =
    useMediaList({
      albumId,
    });
  const viewer = useMediaViewer();
  const { gridMode, handleLongPress, handleToggleDateGroup, loadingDateKey } =
    useMediaGridInteraction({ loadItemsForDateKey });
  const [albumName, setAlbumName] = useState("");
  const [albumCoverMediaId, setAlbumCoverMediaId] = useState<string | undefined>();

  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  const loadAlbumMeta = useCallback(async () => {
    const res = await fetch(`${base}/api/albums/${albumId}`);
    const d = await res.json();
    setAlbumName(d.name ?? "");
    setAlbumCoverMediaId(d.coverMediaId);
  }, [albumId, base]);

  useEffect(() => {
    void loadAlbumMeta();
  }, [loadAlbumMeta]);

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center gap-2 border-b border-zinc-200/80 px-4 py-3 dark:border-zinc-800">
        <Link
          href="/collections"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
          aria-label="모음으로 닫기"
        >
          <X className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{albumName || "앨범"}</h1>
          {gridMode.mode === "select" && gridMode.selectedCount > 0 && (
            <p className="text-xs text-zinc-500">
              {gridMode.selectedCount}개 선택
            </p>
          )}
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        <MediaGrid
          items={items}
          columnCount={4}
          mode={gridMode.mode}
          selectedIds={gridMode.selectedIds}
          onSelect={(item) => viewer.select(item.id)}
          onToggleSelect={gridMode.toggleSelect}
          onSelectMany={gridMode.selectMany}
          onDeselectMany={gridMode.deselectMany}
          onToggleDateGroup={handleToggleDateGroup}
          loadingDateKey={loadingDateKey}
          onLongPress={handleLongPress}
          hasMore={hasMore}
          loadingMore={loading}
          onLoadMore={loadMore}
        />
      </div>
      <GridActionBar
        mode={gridMode.mode}
        onModeChange={gridMode.setMode}
        selectedIds={gridMode.selectedIds}
        showUpload={false}
        albumId={albumId}
        onAlbumAdded={refresh}
        onRemovedFromAlbum={refresh}
        onDeleted={refresh}
      />
      <MediaViewerLayer
        viewer={viewer}
        onDeleted={() => {
          refresh();
          void loadAlbumMeta();
        }}
        albumId={albumId}
        albumCoverMediaId={albumCoverMediaId}
        onAlbumCoverChange={(coverMediaId) => {
          setAlbumCoverMediaId(coverMediaId);
        }}
      />
    </div>
  );
}

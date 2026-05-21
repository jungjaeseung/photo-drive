"use client";

import { GridActionBar } from "@/components/media/grid-action-bar";
import { MediaGrid } from "@/components/media/media-grid";
import { MediaViewerLayer } from "@/components/media/media-viewer-layer";
import { useMediaGridInteraction } from "@/hooks/use-media-grid-interaction";
import { useMediaViewer } from "@/hooks/use-media-viewer";
import { useMediaList } from "@/hooks/use-media-list";
import { useEffect, useRef, useState } from "react";

function getColumnCount(width: number) {
  if (width < 640) return 3;
  if (width < 1024) return 5;
  return 7;
}

export default function LibraryPage() {
  const { items, loading, hasMore, loadMore, refresh, prependProcessingItem } =
    useMediaList();
  const viewer = useMediaViewer();
  const { gridMode, handleLongPress } = useMediaGridInteraction();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [columnCount, setColumnCount] = useState(4);

  useEffect(() => {
    const update = () => setColumnCount(getColumnCount(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="flex h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/90 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <h1 className="text-xl font-bold">보관함</h1>
        <p className="text-xs text-zinc-500">
          {gridMode.mode === "select" && gridMode.selectedCount > 0
            ? `${gridMode.selectedCount}개 선택`
            : `${items.length}개 항목`}
        </p>
      </header>
      <div className="flex-1 overflow-hidden">
        {items.length === 0 && !loading ? (
          <div className="flex h-full items-center justify-center text-zinc-500">
            사진이나 동영상을 업로드하세요
          </div>
        ) : (
          <MediaGrid
            items={items}
            columnCount={columnCount}
            mode={gridMode.mode}
            selectedIds={gridMode.selectedIds}
            onSelect={(item) => viewer.select(item.id)}
            onToggleSelect={gridMode.toggleSelect}
            onToggleGroup={gridMode.toggleGroup}
            onLongPress={handleLongPress}
          />
        )}
        <div ref={sentinelRef} className="h-4" />
        {loading && (
          <p className="py-4 text-center text-sm text-zinc-500">불러오는 중…</p>
        )}
        {!hasMore && items.length > 0 && (
          <p className="py-4 text-center text-xs text-zinc-400">모두 불러옴</p>
        )}
      </div>
      <GridActionBar
        mode={gridMode.mode}
        onModeChange={gridMode.setMode}
        selectedIds={gridMode.selectedIds}
        showUpload
        onItemUploaded={prependProcessingItem}
        onUploaded={refresh}
        onAlbumAdded={refresh}
      />
      <MediaViewerLayer viewer={viewer} onDeleted={refresh} />
    </div>
  );
}

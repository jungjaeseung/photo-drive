"use client";

import { GridActionBar } from "@/components/media/grid-action-bar";
import { MediaGrid } from "@/components/media/media-grid";
import { MediaViewerLayer } from "@/components/media/media-viewer-layer";
import { useMediaGridInteraction } from "@/hooks/use-media-grid-interaction";
import { useMediaViewer } from "@/hooks/use-media-viewer";
import { useMediaList } from "@/hooks/use-media-list";
import {
  getLibraryFavoritesOnly,
  setLibraryFavoritesOnly,
} from "@/lib/library-favorites-filter";
import { cn } from "@/lib/utils";
import { Heart } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

function getColumnCount(width: number) {
  if (width < 640) return 3;
  if (width < 1024) return 5;
  return 7;
}

export default function LibraryPage() {
  const [favoritesFilter, setFavoritesFilter] = useState(false);
  const [filterReady, setFilterReady] = useState(false);

  useEffect(() => {
    setFavoritesFilter(getLibraryFavoritesOnly());
    setFilterReady(true);
  }, []);

  const toggleFavoritesFilter = useCallback(() => {
    setFavoritesFilter((prev) => {
      const next = !prev;
      setLibraryFavoritesOnly(next);
      return next;
    });
  }, []);

  const {
    items,
    loading,
    hasMore,
    loadMore,
    refresh,
    prependProcessingItem,
    loadItemsForDateKey,
    setItemFavorited,
  } = useMediaList({ favoritesOnly: filterReady && favoritesFilter });
  const viewer = useMediaViewer();
  const { gridMode, handleLongPress, handleToggleDateGroup, loadingDateKey } =
    useMediaGridInteraction({ loadItemsForDateKey });
  const [columnCount, setColumnCount] = useState(4);

  useEffect(() => {
    const update = () => setColumnCount(getColumnCount(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div className="flex h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/90 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-xl font-bold">보관함</h1>
            <p className="text-xs text-zinc-500">
              {gridMode.mode === "select" && gridMode.selectedCount > 0
                ? `${gridMode.selectedCount}개 선택`
                : favoritesFilter
                  ? `즐겨찾기 ${items.length}개`
                  : `${items.length}개 항목`}
            </p>
          </div>
          <button
            type="button"
            aria-label={
              favoritesFilter ? "전체 보관함 보기" : "즐겨찾기만 보기"
            }
            aria-pressed={favoritesFilter}
            onClick={toggleFavoritesFilter}
            className={cn(
              "mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors",
              favoritesFilter
                ? "border-red-200 bg-red-50 text-red-500 dark:border-red-900 dark:bg-red-950/40"
                : "border-zinc-200 text-zinc-500 dark:border-zinc-700"
            )}
          >
            <Heart
              className={cn(
                "h-5 w-5",
                favoritesFilter && "fill-red-500 text-red-500"
              )}
            />
          </button>
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        {!filterReady ? null : items.length === 0 && !loading ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-zinc-500">
            {favoritesFilter
              ? "즐겨찾기한 항목이 없습니다"
              : "사진이나 동영상을 업로드하세요"}
          </div>
        ) : (
          <MediaGrid
            items={items}
            columnCount={columnCount}
            mode={gridMode.mode}
            selectedIds={gridMode.selectedIds}
            onSelect={(item) => viewer.select(item.id)}
          onToggleSelect={gridMode.toggleSelect}
          onSelectMany={gridMode.selectMany}
          onDeselectMany={gridMode.deselectMany}
          onToggleDateGroup={handleToggleDateGroup}
            loadingDateKey={loadingDateKey}
            onLongPress={handleLongPress}
            onFavoritedChange={setItemFavorited}
            hasMore={hasMore}
            loadingMore={loading}
            onLoadMore={loadMore}
          />
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
        onDeleted={refresh}
      />
      <MediaViewerLayer
        viewer={viewer}
        onDeleted={refresh}
        onFavoritedChange={setItemFavorited}
      />
    </div>
  );
}

"use client";

import { GridActionBar } from "@/components/media/grid-action-bar";
import { FavoritesFilterToggle } from "@/components/media/favorites-filter-toggle";
import { MediaGrid } from "@/components/media/media-grid";
import { MediaViewerLayer } from "@/components/media/media-viewer-layer";
import { useFavoritesFilter } from "@/hooks/use-favorites-filter";
import { useMediaGridInteraction } from "@/hooks/use-media-grid-interaction";
import { useMediaViewer } from "@/hooks/use-media-viewer";
import { useMediaList } from "@/hooks/use-media-list";

export default function PhotosOnlyPage() {
  const {
    favoritesOnly,
    favoritesFilter,
    filterReady,
    toggle: toggleFavoritesFilter,
  } = useFavoritesFilter();

  const {
    items,
    loading,
    hasMore,
    loadMore,
    refresh,
    prependProcessingItem,
    loadItemsForDateKey,
    setItemFavorited,
  } = useMediaList({
    type: "image",
    favoritesOnly,
  });
  const viewer = useMediaViewer();
  const { gridMode, handleLongPress, handleToggleDateGroup, loadingDateKey } =
    useMediaGridInteraction({ loadItemsForDateKey });

  return (
    <div className="flex h-dvh flex-col">
      <header className="border-b border-zinc-200/80 px-4 py-3 dark:border-zinc-800">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-xl font-bold">사진</h1>
            <p className="text-xs text-zinc-500">
              {gridMode.mode === "select" && gridMode.selectedCount > 0
                ? `${gridMode.selectedCount}개 선택`
                : favoritesFilter
                  ? `즐겨찾기 ${items.length}개`
                  : `${items.length}개 항목`}
            </p>
          </div>
          <FavoritesFilterToggle
            active={favoritesFilter}
            onToggle={toggleFavoritesFilter}
            className="mt-0.5"
          />
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        {!filterReady ? null : items.length === 0 && !loading ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-zinc-500">
            {favoritesFilter
              ? "즐겨찾기한 사진이 없습니다"
              : "사진이 없습니다"}
          </div>
        ) : (
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
            onFavoritedChange={setItemFavorited}
            showFavoriteHearts={!favoritesFilter}
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
        onItemUploaded={(item) => {
          if (item.type === "image") prependProcessingItem(item);
        }}
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

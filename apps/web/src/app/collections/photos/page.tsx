"use client";

import { GridActionBar } from "@/components/media/grid-action-bar";
import { MediaGrid } from "@/components/media/media-grid";
import { MediaViewerLayer } from "@/components/media/media-viewer-layer";
import { useMediaGridInteraction } from "@/hooks/use-media-grid-interaction";
import { useMediaViewer } from "@/hooks/use-media-viewer";
import { useMediaList } from "@/hooks/use-media-list";

export default function PhotosOnlyPage() {
  const { items, loading, hasMore, loadMore, refresh, prependProcessingItem } =
    useMediaList({
      type: "image",
    });
  const viewer = useMediaViewer();
  const { gridMode, handleLongPress } = useMediaGridInteraction();

  return (
    <div className="flex h-dvh flex-col">
      <header className="border-b border-zinc-200/80 px-4 py-3 dark:border-zinc-800">
        <h1 className="text-xl font-bold">사진</h1>
        {gridMode.mode === "select" && gridMode.selectedCount > 0 && (
          <p className="text-xs text-zinc-500">
            {gridMode.selectedCount}개 선택
          </p>
        )}
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
          onToggleGroup={gridMode.toggleGroup}
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
        showUpload
        onItemUploaded={(item) => {
          if (item.type === "image") prependProcessingItem(item);
        }}
        onUploaded={refresh}
        onAlbumAdded={refresh}
        onDeleted={refresh}
      />
      <MediaViewerLayer viewer={viewer} onDeleted={refresh} />
    </div>
  );
}

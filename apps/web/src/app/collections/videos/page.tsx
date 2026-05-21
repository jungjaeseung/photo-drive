"use client";

import { GridActionBar } from "@/components/media/grid-action-bar";
import { MediaGrid } from "@/components/media/media-grid";
import { MediaViewerLayer } from "@/components/media/media-viewer-layer";
import { useMediaGridInteraction } from "@/hooks/use-media-grid-interaction";
import { useMediaViewer } from "@/hooks/use-media-viewer";
import { useMediaList } from "@/hooks/use-media-list";

export default function VideosOnlyPage() {
  const { items, refresh } = useMediaList({ type: "video" });
  const viewer = useMediaViewer();
  const { gridMode, handleLongPress } = useMediaGridInteraction();

  return (
    <div className="flex h-dvh flex-col">
      <header className="border-b border-zinc-200/80 px-4 py-3 dark:border-zinc-800">
        <h1 className="text-xl font-bold">동영상</h1>
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
          onToggleGroup={gridMode.toggleGroup}
          onLongPress={handleLongPress}
        />
      </div>
      <GridActionBar
        mode={gridMode.mode}
        onModeChange={gridMode.setMode}
        selectedIds={gridMode.selectedIds}
        showUpload
        onUploaded={refresh}
        onAlbumAdded={refresh}
      />
      <MediaViewerLayer viewer={viewer} onDeleted={refresh} />
    </div>
  );
}

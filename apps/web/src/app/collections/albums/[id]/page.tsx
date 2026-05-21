"use client";

import { GridActionBar } from "@/components/media/grid-action-bar";
import { MediaGrid } from "@/components/media/media-grid";
import { MediaViewerLayer } from "@/components/media/media-viewer-layer";
import { useMediaGridInteraction } from "@/hooks/use-media-grid-interaction";
import { useMediaViewer } from "@/hooks/use-media-viewer";
import { useMediaList } from "@/hooks/use-media-list";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function AlbumDetailPage() {
  const params = useParams();
  const albumId = params.id as string;
  const { items, refresh } = useMediaList({ albumId });
  const viewer = useMediaViewer();
  const { gridMode, handleLongPress } = useMediaGridInteraction();
  const [albumName, setAlbumName] = useState("");

  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  useEffect(() => {
    fetch(`${base}/api/albums/${albumId}`)
      .then((r) => r.json())
      .then((d) => setAlbumName(d.name ?? ""));
  }, [albumId, base]);

  return (
    <div className="flex h-dvh flex-col pb-24">
      <header className="border-b border-zinc-200/80 px-4 py-3 dark:border-zinc-800">
        <h1 className="text-xl font-bold">{albumName || "앨범"}</h1>
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
          onLongPress={handleLongPress}
        />
      </div>
      <GridActionBar
        mode={gridMode.mode}
        onModeChange={gridMode.setMode}
        selectedIds={gridMode.selectedIds}
        showUpload={false}
        onAlbumAdded={refresh}
      />
      <MediaViewerLayer viewer={viewer} onDeleted={refresh} />
    </div>
  );
}

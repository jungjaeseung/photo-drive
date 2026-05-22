"use client";

import { GridActionBar } from "@/components/media/grid-action-bar";
import { FavoritesFilterToggle } from "@/components/media/favorites-filter-toggle";
import { MediaGrid } from "@/components/media/media-grid";
import { MediaViewerLayer } from "@/components/media/media-viewer-layer";
import { useFavoritesFilter } from "@/hooks/use-favorites-filter";
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
    loadItemsForDateKey,
    setItemFavorited,
  } = useMediaList({
    albumId,
    favoritesOnly,
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
        <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold">{albumName || "앨범"}</h1>
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
            className="mt-0.5 shrink-0"
          />
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        {!filterReady ? null : items.length === 0 && !loading ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-zinc-500">
            {favoritesFilter
              ? "이 앨범의 즐겨찾기가 없습니다"
              : "앨범에 항목이 없습니다"}
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
        onFavoritedChange={setItemFavorited}
      />
    </div>
  );
}

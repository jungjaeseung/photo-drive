"use client";

import { MediaGrid } from "@/components/media/media-grid";
import { MediaViewerLayer } from "@/components/media/media-viewer-layer";
import { UploadButton } from "@/components/media/upload-button";
import { useMediaViewer } from "@/hooks/use-media-viewer";
import { useMediaList } from "@/hooks/use-media-list";

export default function PhotosOnlyPage() {
  const { items, refresh } = useMediaList({ type: "image" });
  const viewer = useMediaViewer();

  return (
    <div className="flex h-dvh flex-col pb-24">
      <header className="border-b border-zinc-200/80 px-4 py-3 dark:border-zinc-800">
        <h1 className="text-xl font-bold">사진</h1>
      </header>
      <div className="flex-1 overflow-hidden">
        <MediaGrid
          items={items}
          columnCount={4}
          onSelect={(item) => viewer.select(item.id)}
        />
      </div>
      <UploadButton onUploaded={refresh} />
      <MediaViewerLayer viewer={viewer} onDeleted={refresh} />
    </div>
  );
}

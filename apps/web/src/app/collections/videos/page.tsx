"use client";

import { MediaGrid } from "@/components/media/media-grid";
import { UploadButton } from "@/components/media/upload-button";
import { useMediaList } from "@/hooks/use-media-list";

export default function VideosOnlyPage() {
  const { items, refresh } = useMediaList({ type: "video" });

  return (
    <div className="flex h-dvh flex-col pb-24">
      <header className="border-b border-zinc-200/80 px-4 py-3 dark:border-zinc-800">
        <h1 className="text-xl font-bold">동영상</h1>
      </header>
      <div className="flex-1 overflow-hidden">
        <MediaGrid items={items} columnCount={4} />
      </div>
      <UploadButton onUploaded={refresh} />
    </div>
  );
}

"use client";

import { MediaGrid } from "@/components/media/media-grid";
import { useMediaList } from "@/hooks/use-media-list";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function AlbumDetailPage() {
  const params = useParams();
  const albumId = params.id as string;
  const { items } = useMediaList({ albumId });
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
      </header>
      <div className="flex-1 overflow-hidden">
        <MediaGrid items={items} columnCount={4} />
      </div>
    </div>
  );
}

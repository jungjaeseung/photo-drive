"use client";

import { AlbumGrid, type AlbumGridItem } from "@/components/collections/album-grid";
import { CategoryGrid } from "@/components/collections/category-grid";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useState } from "react";

export default function CollectionsPage() {
  const [albums, setAlbums] = useState<AlbumGridItem[]>([]);
  const [name, setName] = useState("");
  const [photoThumb, setPhotoThumb] = useState<string | undefined>();
  const [videoThumb, setVideoThumb] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  const loadAlbums = useCallback(async () => {
    const res = await fetch(`${base}/api/albums`);
    const data = await res.json();
    setAlbums(data.items ?? []);
  }, [base]);

  const loadCategoryPreviews = useCallback(async () => {
    const [photoRes, videoRes] = await Promise.all([
      fetch(`${base}/api/media?type=image&size=1`),
      fetch(`${base}/api/media?type=video&size=1`),
    ]);
    const photoData = await photoRes.json();
    const videoData = await videoRes.json();
    setPhotoThumb(photoData.items?.[0]?.thumbnailUrl);
    setVideoThumb(videoData.items?.[0]?.thumbnailUrl);
  }, [base]);

  useEffect(() => {
    Promise.all([loadAlbums(), loadCategoryPreviews()]).finally(() =>
      setLoading(false)
    );
  }, [loadAlbums, loadCategoryPreviews]);

  async function createAlbum() {
    if (!name.trim()) return;
    await fetch(`${base}/api/albums`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    setName("");
    loadAlbums();
  }

  return (
    <div className="pb-24">
      <header className="border-b border-zinc-200/80 px-4 py-3 dark:border-zinc-800">
        <h1 className="text-xl font-bold">모음</h1>
      </header>

      <section className="py-4">
        <div className="mb-3 flex items-center justify-between px-4">
          <h2 className="text-base font-semibold">앨범</h2>
        </div>
        <div className="mb-4 flex gap-2 px-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="새 앨범 이름"
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            onKeyDown={(e) => e.key === "Enter" && createAlbum()}
          />
          <Button onClick={createAlbum} disabled={!name.trim()}>
            만들기
          </Button>
        </div>
        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-500">
            불러오는 중…
          </p>
        ) : (
          <AlbumGrid albums={albums} />
        )}
      </section>

      <section className="border-t border-zinc-200 py-4 dark:border-zinc-800">
        <h2 className="mb-3 px-4 text-base font-semibold">카테고리</h2>
        <CategoryGrid
          photoThumbnailUrl={photoThumb}
          videoThumbnailUrl={videoThumb}
        />
      </section>
    </div>
  );
}

"use client";

import { AlbumGrid, type AlbumGridItem } from "@/components/collections/album-grid";
import { CategoryGrid } from "@/components/collections/category-grid";
import { Button } from "@/components/ui/button";
import { useCategoryPreviewRotation } from "@/hooks/use-category-preview-rotation";
import { Loader2, Settings } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export default function CollectionsPage() {
  const [albums, setAlbums] = useState<AlbumGridItem[]>([]);
  const [draftAlbums, setDraftAlbums] = useState<AlbumGridItem[]>([]);
  const [name, setName] = useState("");
  const { photoThumb, videoThumb, photoMediaId, videoMediaId } =
    useCategoryPreviewRotation();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  const loadAlbums = useCallback(async () => {
    const res = await fetch(`${base}/api/albums`);
    const data = await res.json();
    setAlbums(data.items ?? []);
  }, [base]);

  useEffect(() => {
    loadAlbums().finally(() => setLoading(false));
  }, [loadAlbums]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") loadAlbums();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [loadAlbums]);

  async function createAlbum() {
    if (!name.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch(`${base}/api/albums`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error("앨범 생성 실패");
      const created = (await res.json()) as AlbumGridItem;
      setName("");
      await loadAlbums();
      if (reorderMode) {
        setDraftAlbums((prev) => [
          ...prev,
          { ...created, mediaCount: 0, coverThumbnailUrl: undefined },
        ]);
      }
    } finally {
      setCreating(false);
    }
  }

  function enterReorderMode() {
    setDraftAlbums([...albums]);
    setReorderMode(true);
  }

  function cancelReorder() {
    setReorderMode(false);
    setDraftAlbums([]);
    setName("");
  }

  async function saveReorder() {
    setSavingOrder(true);
    try {
      const res = await fetch(`${base}/api/albums/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          albumIds: draftAlbums.map((a) => a.id),
        }),
      });
      if (!res.ok) throw new Error("순서 저장 실패");
      await loadAlbums();
      setReorderMode(false);
    } finally {
      setSavingOrder(false);
    }
  }

  async function handleDeleteAlbum(albumId: string) {
    const res = await fetch(`${base}/api/albums/${albumId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "앨범 삭제 실패");
    }
    if (reorderMode) {
      setDraftAlbums((prev) => prev.filter((a) => a.id !== albumId));
    }
    setAlbums((prev) => prev.filter((a) => a.id !== albumId));
  }

  useEffect(() => {
    if (!reorderMode) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [reorderMode]);

  return (
    <div className="pb-safe-page">
      <header className="border-b border-zinc-200/80 px-4 py-3 dark:border-zinc-800">
        <h1 className="text-xl font-bold">모음</h1>
      </header>

      <section className="py-4">
        <h2 className="mb-3 px-4 text-base font-semibold">카테고리</h2>
        <CategoryGrid
          photoThumbnailUrl={photoThumb}
          videoThumbnailUrl={videoThumb}
          photoMediaId={photoMediaId}
          videoMediaId={videoMediaId}
        />
      </section>

      <section className="border-t border-zinc-200 py-4 dark:border-zinc-800">
        <div className="mb-3 flex items-center justify-between px-4">
          <h2 className="text-base font-semibold">앨범</h2>
          {!reorderMode ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={enterReorderMode}
              disabled={albums.length === 0}
              aria-label="앨범 순서 설정"
            >
              <Settings className="h-5 w-5" />
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={cancelReorder}>
                취소
              </Button>
              <Button size="sm" disabled={savingOrder} onClick={saveReorder}>
                {savingOrder ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "완료"
                )}
              </Button>
            </div>
          )}
        </div>

        {reorderMode && (
          <>
            <p className="mb-3 px-4 text-xs text-zinc-500">
              앨범을 드래그하여 순서를 변경하거나 새 앨범을 만드세요.
            </p>
            <div className="mb-4 flex gap-2 px-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="새 앨범 이름"
              disabled={creating}
              className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
              onKeyDown={(e) => e.key === "Enter" && !creating && createAlbum()}
            />
            <Button
              onClick={createAlbum}
              disabled={!name.trim() || creating}
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "만들기"
              )}
            </Button>
          </div>
          </>
        )}

        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-500">
            불러오는 중…
          </p>
        ) : (
          <AlbumGrid
            albums={reorderMode ? draftAlbums : albums}
            reorderMode={reorderMode}
            onReorder={setDraftAlbums}
            onDelete={handleDeleteAlbum}
          />
        )}
      </section>
    </div>
  );
}

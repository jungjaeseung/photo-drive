"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { addMediaToAlbums } from "@/lib/album-media";
import { cn } from "@/lib/utils";
import { FolderOpen, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface AlbumItem {
  id: string;
  name: string;
  mediaCount: number;
  coverThumbnailUrl?: string;
}

interface AlbumPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaIds: string[];
  onDone?: () => void;
}

export function AlbumPickerDialog({
  open,
  onOpenChange,
  mediaIds,
  onDone,
}: AlbumPickerDialogProps) {
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  const loadAlbums = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${base}/api/albums`);
      const data = await res.json();
      setAlbums(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    if (open) {
      setError(null);
      setProgress(null);
      loadAlbums();
    }
  }, [open, loadAlbums]);

  async function addToAlbum(albumId: string, albumName: string) {
    if (!mediaIds.length) return;
    setBusy(true);
    setError(null);
    setProgress(`「${albumName}」에 추가하는 중…`);

    try {
      await addMediaToAlbums(albumId, mediaIds, (done, total) => {
        setProgress(`「${albumName}」에 추가하는 중… (${done}/${total})`);
      });
      setProgress("완료");
      onDone?.();
      onOpenChange(false);
    } catch (e) {
      setError(String(e));
      setProgress(null);
    } finally {
      setBusy(false);
    }
  }

  async function handlePickAlbum(albumId: string, albumName: string) {
    await addToAlbum(albumId, albumName);
  }

  async function handleCreateAlbum() {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    setProgress("앨범 만드는 중…");
    try {
      const res = await fetch(`${base}/api/albums`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("앨범 생성 실패");
      const album = await res.json();
      setNewName("");
      await addToAlbum(album.id, album.name ?? name);
    } catch (e) {
      setError(String(e));
      setProgress(null);
      setBusy(false);
    }
  }

  function handleOpenChange(next: boolean) {
    if (busy && !next) return;
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="!inset-auto !left-1/2 !top-1/2 !h-auto !max-h-[80vh] !w-[min(100%,24rem)] !-translate-x-1/2 !-translate-y-1/2 !flex-none rounded-xl bg-zinc-900 p-0 text-white shadow-xl">
        <div className="relative flex flex-col">
          {busy && (
            <div
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl bg-zinc-950/80 backdrop-blur-sm"
              aria-live="polite"
              aria-busy="true"
            >
              <Loader2 className="h-10 w-10 animate-spin text-pink-400" />
              <p className="px-6 text-center text-sm font-medium text-white">
                {progress ?? "처리 중…"}
              </p>
            </div>
          )}

          <div className="border-b border-zinc-800 px-4 py-3 pr-12">
            <DialogTitle className="text-base font-semibold">
              앨범 선택
            </DialogTitle>
            {mediaIds.length > 1 && (
              <p className="mt-0.5 text-xs text-zinc-400">
                {mediaIds.length}개 항목
              </p>
            )}
          </div>

          <div
            className={cn(
              "max-h-[50vh] overflow-y-auto",
              busy && "pointer-events-none opacity-60"
            )}
          >
            {loading && !busy ? (
              <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                불러오는 중…
              </div>
            ) : albums.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-zinc-400">
                앨범이 없습니다. 아래에서 새로 만드세요.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-800">
                {albums.map((album) => (
                  <li key={album.id}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handlePickAlbum(album.id, album.name)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-zinc-800 disabled:opacity-50"
                    >
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-zinc-800">
                        {album.coverThumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={album.coverThumbnailUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <FolderOpen className="h-6 w-6 text-zinc-600" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{album.name}</p>
                        <p className="text-xs text-zinc-400">
                          {album.mediaCount}개
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-zinc-800 px-4 py-3">
            <p className="mb-2 text-xs text-zinc-400">새 앨범 만들기</p>
            <div className="flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="앨범 이름"
                disabled={busy}
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm disabled:opacity-50"
                onKeyDown={(e) =>
                  e.key === "Enter" && !busy && handleCreateAlbum()
                }
              />
              <Button
                size="sm"
                disabled={busy || !newName.trim()}
                onClick={handleCreateAlbum}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "만들기"
                )}
              </Button>
            </div>
          </div>

          {error && (
            <p className="px-4 pb-3 text-xs text-red-400">{error}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

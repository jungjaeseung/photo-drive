"use client";

import { FolderOpen } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export interface AlbumGridItem {
  id: string;
  name: string;
  mediaCount: number;
  coverThumbnailUrl?: string;
}

interface AlbumGridProps {
  albums: AlbumGridItem[];
  columnCount?: number;
}

function getColumnCount(width: number) {
  if (width < 640) return 2;
  if (width < 1024) return 3;
  return 4;
}

export function AlbumGrid({ albums, columnCount: columnCountProp }: AlbumGridProps) {
  const [columnCount, setColumnCount] = useState(columnCountProp ?? 3);

  useEffect(() => {
    if (columnCountProp) return;
    const update = () => setColumnCount(getColumnCount(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [columnCountProp]);

  const cols = columnCountProp ?? columnCount;

  if (albums.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-zinc-500">
        앨범이 없습니다. 위에서 새 앨범을 만드세요.
      </p>
    );
  }

  return (
    <div
      className="grid gap-2 px-2"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      }}
    >
      {albums.map((album) => (
        <Link
          key={album.id}
          href={`/collections/albums/${album.id}`}
          className="group flex flex-col overflow-hidden rounded-lg"
        >
          <div className="relative aspect-square overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900">
            {album.coverThumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={album.coverThumbnailUrl}
                alt=""
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <FolderOpen className="h-10 w-10 text-zinc-400" />
              </div>
            )}
          </div>
          <p className="mt-1 truncate px-0.5 text-sm font-medium">
            {album.name}
          </p>
          <p className="px-0.5 text-xs text-zinc-500">{album.mediaCount}개</p>
        </Link>
      ))}
    </div>
  );
}

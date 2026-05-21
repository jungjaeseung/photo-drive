"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Album {
  id: string;
  name: string;
  mediaCount: number;
}

export default function AlbumsPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [name, setName] = useState("");

  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  async function load() {
    const res = await fetch(`${base}/api/albums`);
    const data = await res.json();
    setAlbums(data.items ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function createAlbum() {
    if (!name.trim()) return;
    await fetch(`${base}/api/albums`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    setName("");
    load();
  }

  return (
    <div className="pb-24">
      <header className="border-b border-zinc-200/80 px-4 py-3 dark:border-zinc-800">
        <h1 className="text-xl font-bold">앨범</h1>
      </header>
      <div className="flex gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="새 앨범 이름"
          className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <Button onClick={createAlbum}>만들기</Button>
      </div>
      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {albums.map((album) => (
          <li key={album.id}>
            <Link
              href={`/collections/albums/${album.id}`}
              className="flex items-center justify-between px-4 py-4 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              <span className="font-medium">{album.name}</span>
              <span className="text-sm text-zinc-500">{album.mediaCount}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

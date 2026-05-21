export async function addMediaToAlbum(
  albumId: string,
  mediaId: string
): Promise<void> {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const res = await fetch(`${base}/api/albums/${albumId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mediaId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "앨범 추가 실패");
  }
}

export async function addMediaToAlbums(
  albumId: string,
  mediaIds: string[],
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  const total = mediaIds.length;
  for (let i = 0; i < total; i++) {
    await addMediaToAlbum(albumId, mediaIds[i]);
    onProgress?.(i + 1, total);
  }
}

export async function removeMediaFromAlbum(
  albumId: string,
  mediaId: string
): Promise<void> {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const res = await fetch(
    `${base}/api/albums/${albumId}/media?mediaId=${encodeURIComponent(mediaId)}`,
    { method: "DELETE" }
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "앨범에서 제거 실패");
  }
}

export async function removeMediaFromAlbums(
  albumId: string,
  mediaIds: string[]
): Promise<void> {
  for (const mediaId of mediaIds) {
    await removeMediaFromAlbum(albumId, mediaId);
  }
}

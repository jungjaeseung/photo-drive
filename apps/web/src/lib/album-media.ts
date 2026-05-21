export async function addMediaToAlbum(
  albumId: string,
  mediaId: string
): Promise<void> {
  await addMediaToAlbums(albumId, [mediaId]);
}

export async function addMediaToAlbums(
  albumId: string,
  mediaIds: string[],
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  if (mediaIds.length === 0) return;

  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const res = await fetch(`${base}/api/albums/${albumId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mediaIds }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "앨범 추가 실패");
  }
  onProgress?.(mediaIds.length, mediaIds.length);
}

export async function removeMediaFromAlbum(
  albumId: string,
  mediaId: string
): Promise<void> {
  await removeMediaFromAlbums(albumId, [mediaId]);
}

export async function removeMediaFromAlbums(
  albumId: string,
  mediaIds: string[]
): Promise<void> {
  if (mediaIds.length === 0) return;

  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const params = new URLSearchParams();
  for (const id of mediaIds) {
    params.append("mediaId", id);
  }
  const res = await fetch(
    `${base}/api/albums/${albumId}/media?${params.toString()}`,
    { method: "DELETE" }
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "앨범에서 제거 실패");
  }
}

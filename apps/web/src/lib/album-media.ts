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
  mediaIds: string[]
): Promise<void> {
  for (const mediaId of mediaIds) {
    await addMediaToAlbum(albumId, mediaId);
  }
}

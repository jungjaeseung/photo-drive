export async function setFavorite(
  mediaId: string,
  favorited: boolean
): Promise<boolean> {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const res = await fetch(`${base}/api/media/${mediaId}/favorite`, {
    method: favorited ? "PUT" : "DELETE",
  });
  if (!res.ok) throw new Error("즐겨찾기 변경 실패");
  const data = (await res.json()) as { favorited?: boolean };
  return data.favorited ?? favorited;
}

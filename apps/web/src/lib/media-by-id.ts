import type { MediaGridItem } from "@/components/media/media-grid";

export async function fetchMediaByIds(
  ids: string[]
): Promise<MediaGridItem[]> {
  if (ids.length === 0) return [];
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        const res = await fetch(`${base}/api/media/${id}`);
        if (!res.ok) return null;
        return (await res.json()) as MediaGridItem;
      } catch {
        return null;
      }
    })
  );
  return results.filter((item): item is MediaGridItem => item != null);
}

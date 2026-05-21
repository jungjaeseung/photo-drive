import type { MediaGridItem } from "@/components/media/media-grid";

/** 촬영(또는 업로드) 시각 기준 최신순 */
export function sortMediaItems<T extends MediaGridItem>(items: T[]): T[] {
  return [...items].sort((a, b) => compareMediaByTakenAtDesc(a, b));
}

export function compareMediaByTakenAtDesc(
  a: MediaGridItem,
  b: MediaGridItem
): number {
  const ta = a.takenAt || a.uploadedAt;
  const tb = b.takenAt || b.uploadedAt;
  const byTime = tb.localeCompare(ta);
  if (byTime !== 0) return byTime;
  return b.id.localeCompare(a.id);
}

export function mediaSortKey(item: MediaGridItem): string {
  return `${item.takenAt || item.uploadedAt}|${item.id}`;
}

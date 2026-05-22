import type { MediaGridItem } from "@/components/media/media-grid";
import {
  computeSortAt,
  formatKstDateLabel,
  getKstDateKey,
  getSortIso,
  getSortMillis,
} from "@photo-drive/shared/media-date";

export {
  computeSortAt,
  formatKstDateLabel,
  getKstDateKey,
  getSortIso,
  getSortMillis,
};

/** UTC 기준 최신순 */
export function sortMediaItems<T extends MediaGridItem>(items: T[]): T[] {
  return [...items].sort((a, b) => compareMediaByTakenAtDesc(a, b));
}

/** 동일 id가 여러 번 들어온 경우(append·동시 fetch) 마지막 항목만 유지 */
export function dedupeMediaById<T extends MediaGridItem>(items: T[]): T[] {
  const byId = new Map<string, T>();
  for (const item of items) byId.set(item.id, item);
  return Array.from(byId.values());
}

export function compareMediaByTakenAtDesc(
  a: MediaGridItem,
  b: MediaGridItem
): number {
  const diff = getSortMillis(b) - getSortMillis(a);
  if (diff !== 0) return diff;
  return b.id.localeCompare(a.id);
}

export function mediaSortKey(item: MediaGridItem): string {
  return `${getSortIso(item)}|${item.id}`;
}

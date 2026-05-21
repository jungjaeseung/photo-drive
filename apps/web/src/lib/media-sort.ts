import type { MediaGridItem } from "@/components/media/media-grid";
import {
  getEffectiveSortIso,
  getEffectiveSortMillis,
} from "@photo-drive/shared";

/** 촬영·업로드 시각 통합 기준 최신순 */
export function sortMediaItems<T extends MediaGridItem>(items: T[]): T[] {
  return [...items].sort((a, b) => compareMediaByTakenAtDesc(a, b));
}

export function compareMediaByTakenAtDesc(
  a: MediaGridItem,
  b: MediaGridItem
): number {
  const diff = getEffectiveSortMillis(b) - getEffectiveSortMillis(a);
  if (diff !== 0) return diff;
  return b.id.localeCompare(a.id);
}

export function mediaSortKey(item: MediaGridItem): string {
  return `${getEffectiveSortIso(item)}|${item.id}`;
}

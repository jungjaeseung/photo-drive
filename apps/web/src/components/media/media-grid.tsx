"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import type { GridMode } from "@/hooks/use-grid-mode";
import {
  formatKstDateLabel,
  getKstDateKey,
  getSortIso,
  sortMediaItems,
} from "@/lib/media-sort";
import { useGridDragSelect } from "@/hooks/use-grid-drag-select";
import { Loader2 } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { MediaGridCell } from "./media-grid-cell";
import { SelectionCheck } from "./selection-check";

export interface MediaGridItem {
  id: string;
  type: "image" | "video";
  status: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  uploadedAt: string;
  takenAt: string;
  sortAt?: string;
  exif?: Record<string, unknown>;
  duration?: number;
  favorited?: boolean;
}

interface MediaGridProps {
  items: MediaGridItem[];
  columnCount?: number;
  mode?: GridMode;
  selectedIds?: Set<string>;
  onSelect?: (item: MediaGridItem) => void;
  onToggleSelect?: (id: string) => void;
  onSelectMany?: (ids: string[]) => void;
  onDeselectMany?: (ids: string[]) => void;
  onToggleGroup?: (ids: string[]) => void;
  onToggleDateGroup?: (dateKey: string, loadedIds: string[]) => void;
  loadingDateKey?: string | null;
  onLongPress?: (item: MediaGridItem) => void;
  onFavoritedChange?: (mediaId: string, favorited: boolean) => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

function groupByDate(
  items: MediaGridItem[]
): {
  dateKey: string;
  label: string;
  itemIds: string[];
  items: MediaGridItem[];
}[] {
  const map = new Map<string, MediaGridItem[]>();
  for (const item of sortMediaItems(items)) {
    const key = getKstDateKey(getSortIso(item));
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, groupItems]) => ({
      dateKey,
      label: formatKstDateLabel(dateKey),
      itemIds: groupItems.map((i) => i.id),
      items: groupItems,
    }));
}

export function MediaGrid({
  items,
  columnCount = 4,
  mode = "detail",
  selectedIds,
  onSelect,
  onToggleSelect,
  onSelectMany,
  onDeselectMany,
  onToggleGroup,
  onToggleDateGroup,
  loadingDateKey = null,
  onLongPress,
  onFavoritedChange,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
}: MediaGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const sections = useMemo(() => groupByDate(items), [items]);

  const { suppressClickRef, dragPointerHandlers } = useGridDragSelect({
    enabled: mode === "select" && !!onSelectMany && !!onDeselectMany,
    selectedIds,
    onSelectMany: onSelectMany ?? (() => {}),
    onDeselectMany: onDeselectMany ?? (() => {}),
  });

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setContainerWidth(width);
    });
    observer.observe(el);
    setContainerWidth(el.clientWidth);
    return () => observer.disconnect();
  }, []);

  type Row =
    | { kind: "header"; dateKey: string; label: string; itemIds: string[] }
    | { kind: "row"; items: MediaGridItem[] };

  const rows: Row[] = useMemo(() => {
    const result: Row[] = [];
    for (const section of sections) {
      result.push({
        kind: "header",
        dateKey: section.dateKey,
        label: section.label,
        itemIds: section.itemIds,
      });
      for (let i = 0; i < section.items.length; i += columnCount) {
        result.push({
          kind: "row",
          items: section.items.slice(i, i + columnCount),
        });
      }
    }
    return result;
  }, [sections, columnCount]);

  const rowHeight = useMemo(() => {
    if (containerWidth <= 0) return 120;
    const gap = 2;
    const cellWidth = (containerWidth - gap * (columnCount - 1)) / columnCount;
    return cellWidth + gap;
  }, [containerWidth, columnCount]);

  const orderedItems = useMemo(
    () => sections.flatMap((section) => section.items),
    [sections]
  );

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) =>
      rows[index].kind === "header" ? 44 : rowHeight,
    overscan: 4,
  });

  const scrollAnchorIdRef = useRef<string | null>(null);
  const prevFirstItemIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const visible = virtualizer.getVirtualItems();
    for (const vr of visible) {
      const row = rows[vr.index];
      if (row?.kind === "row" && row.items[0]) {
        scrollAnchorIdRef.current = row.items[0].id;
        return;
      }
    }
  });

  useLayoutEffect(() => {
    const prevFirst = prevFirstItemIdRef.current;
    const newFirst = items[0]?.id;
    prevFirstItemIdRef.current = newFirst;

    if (!prevFirst || !newFirst || prevFirst === newFirst) return;

    const anchorId = scrollAnchorIdRef.current;
    if (!anchorId) return;

    const rowIndex = rows.findIndex(
      (r) => r.kind === "row" && r.items.some((i) => i.id === anchorId)
    );
    if (rowIndex >= 0) {
      virtualizer.scrollToIndex(rowIndex, { align: "start" });
    }
  }, [items, rows, virtualizer]);

  const totalSize = virtualizer.getTotalSize();

  useEffect(() => {
    if (!onLoadMore || !hasMore) return;
    const root = parentRef.current;
    const sentinel = loadMoreSentinelRef.current;
    if (!root || !sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { root, rootMargin: "400px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore, totalSize, items.length]);

  return (
    <div
      ref={parentRef}
      className="h-full overflow-auto pb-safe-grid"
      style={mode === "select" ? { touchAction: "pan-y" } : undefined}
      {...dragPointerHandlers}
    >
      <div
        style={{ height: totalSize, position: "relative" }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {row.kind === "header" ? (
                <div className="bg-background flex items-center justify-between gap-2 px-3 py-2.5">
                  <h2 className="text-sm font-semibold">{row.label}</h2>
                  {mode === "select" && (
                    <button
                      type="button"
                      disabled={loadingDateKey === row.dateKey}
                      aria-label={`${row.label} 전체 선택`}
                      aria-busy={loadingDateKey === row.dateKey}
                      onClick={() => {
                        if (onToggleDateGroup) {
                          void onToggleDateGroup(row.dateKey, row.itemIds);
                        } else {
                          onToggleGroup?.(row.itemIds);
                        }
                      }}
                      className="p-0.5 disabled:opacity-50"
                    >
                      {loadingDateKey === row.dateKey ? (
                        <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
                      ) : (
                        <SelectionCheck
                          selected={
                            row.itemIds.length > 0 &&
                            row.itemIds.every((id) => selectedIds?.has(id))
                          }
                          partial={
                            row.itemIds.some((id) => selectedIds?.has(id)) &&
                            !row.itemIds.every((id) => selectedIds?.has(id))
                          }
                        />
                      )}
                    </button>
                  )}
                </div>
              ) : (
                <div
                  className="grid gap-0.5 px-0.5"
                  style={{
                    gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                  }}
                >
                  {row.items.map((item) => (
                    <MediaGridCell
                      key={item.id}
                      item={item}
                      mode={mode}
                      selected={selectedIds?.has(item.id) ?? false}
                      orderedItems={orderedItems}
                      suppressClickRef={suppressClickRef}
                      onSelect={onSelect}
                      onToggleSelect={onToggleSelect}
                      onLongPress={onLongPress}
                      onFavoritedChange={onFavoritedChange}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {onLoadMore && hasMore && (
          <div
            ref={loadMoreSentinelRef}
            className="pointer-events-none absolute left-0 w-full"
            style={{ top: totalSize, height: 48 }}
            aria-hidden
          />
        )}
      </div>
      {loadingMore && (
        <p className="py-4 text-center text-sm text-zinc-500">불러오는 중…</p>
      )}
      {!hasMore && items.length > 0 && onLoadMore && (
        <p className="py-3 text-center text-xs text-zinc-400">모두 불러옴</p>
      )}
    </div>
  );
}

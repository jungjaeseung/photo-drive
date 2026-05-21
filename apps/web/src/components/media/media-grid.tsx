"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import type { GridMode } from "@/hooks/use-grid-mode";
import { sortMediaItems } from "@/lib/media-sort";
import { getEffectiveSortIso } from "@photo-drive/shared";
import { useEffect, useMemo, useRef, useState } from "react";
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
  duration?: number;
}

interface MediaGridProps {
  items: MediaGridItem[];
  columnCount?: number;
  mode?: GridMode;
  selectedIds?: Set<string>;
  onSelect?: (item: MediaGridItem) => void;
  onToggleSelect?: (id: string) => void;
  onToggleGroup?: (ids: string[]) => void;
  onLongPress?: (item: MediaGridItem) => void;
}

function groupByDate(
  items: MediaGridItem[]
): { label: string; itemIds: string[]; items: MediaGridItem[] }[] {
  const map = new Map<string, MediaGridItem[]>();
  for (const item of sortMediaItems(items)) {
    const key = format(parseISO(getEffectiveSortIso(item)), "yyyy-MM-dd");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, groupItems]) => ({
      label: format(parseISO(date), "yyyy년 M월 d일", { locale: ko }),
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
  onToggleGroup,
  onLongPress,
}: MediaGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const sections = useMemo(() => groupByDate(items), [items]);

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
    | { kind: "header"; label: string; itemIds: string[] }
    | { kind: "row"; items: MediaGridItem[] };

  const rows: Row[] = useMemo(() => {
    const result: Row[] = [];
    for (const section of sections) {
      result.push({
        kind: "header",
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

  return (
    <div ref={parentRef} className="h-full overflow-auto pb-safe-grid">
      <div
        style={{ height: virtualizer.getTotalSize(), position: "relative" }}
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
                      aria-label={`${row.label} 전체 선택`}
                      onClick={() => onToggleGroup?.(row.itemIds)}
                      className="p-0.5"
                    >
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
                      onSelect={onSelect}
                      onToggleSelect={onToggleSelect}
                      onLongPress={onLongPress}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

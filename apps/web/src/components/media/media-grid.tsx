"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useMemo, useRef } from "react";
import { ProgressiveImage } from "./progressive-image";

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
}

function groupByDate(items: MediaGridItem[]): { label: string; items: MediaGridItem[] }[] {
  const map = new Map<string, MediaGridItem[]>();
  for (const item of items) {
    const key = format(parseISO(item.takenAt || item.uploadedAt), "yyyy-MM-dd");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, groupItems]) => ({
      label: format(parseISO(date), "yyyy년 M월 d일", { locale: ko }),
      items: groupItems,
    }));
}

export function MediaGrid({ items, columnCount = 4 }: MediaGridProps) {
  const router = useRouter();
  const parentRef = useRef<HTMLDivElement>(null);
  const sections = useMemo(() => groupByDate(items), [items]);

  type Row =
    | { kind: "header"; label: string }
    | { kind: "row"; items: MediaGridItem[] };

  const rows: Row[] = useMemo(() => {
    const result: Row[] = [];
    for (const section of sections) {
      result.push({ kind: "header", label: section.label });
      for (let i = 0; i < section.items.length; i += columnCount) {
        result.push({
          kind: "row",
          items: section.items.slice(i, i + columnCount),
        });
      }
    }
    return result;
  }, [sections, columnCount]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => (rows[index].kind === "header" ? 40 : 100),
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="h-full overflow-auto pb-24">
      <div
        style={{ height: virtualizer.getTotalSize(), position: "relative" }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {row.kind === "header" ? (
                <h2 className="sticky top-0 z-10 bg-white/90 px-3 py-2 text-sm font-semibold backdrop-blur dark:bg-zinc-950/90">
                  {row.label}
                </h2>
              ) : (
                <div
                  className="grid gap-0.5 px-0.5"
                  style={{
                    gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                  }}
                >
                  {row.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="relative aspect-square overflow-hidden bg-zinc-100 dark:bg-zinc-900"
                      onClick={() => router.push(`/media/${item.id}`)}
                    >
                      <ProgressiveImage
                        thumbSrc={item.thumbnailUrl}
                        mainSrc={item.thumbnailUrl}
                        alt=""
                        className="aspect-square"
                      />
                      {item.type === "video" && (
                        <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 text-[10px] text-white">
                          {item.duration
                            ? `${Math.floor(item.duration / 60)}:${String(
                                Math.floor(item.duration % 60)
                              ).padStart(2, "0")}`
                            : "VIDEO"}
                        </span>
                      )}
                      {item.status === "processing" && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs text-white">
                          처리 중
                        </span>
                      )}
                    </button>
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

"use client";

import type { MediaGridItem } from "@/components/media/media-grid";
import { fetchMediaByIds } from "@/lib/media-by-id";
import { dedupeMediaById, sortMediaItems } from "@/lib/media-sort";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

function mergeWithOptimisticProcessing(
  prev: MediaGridItem[],
  apiItems: MediaGridItem[]
): MediaGridItem[] {
  const apiIds = new Set(apiItems.map((i) => i.id));
  const pending = prev.filter(
    (i) => i.status === "processing" && !apiIds.has(i.id)
  );
  if (pending.length === 0) return sortMediaItems(dedupeMediaById(apiItems));
  const byId = new Map<string, MediaGridItem>();
  for (const item of pending) byId.set(item.id, item);
  for (const item of apiItems) byId.set(item.id, item);
  return sortMediaItems(Array.from(byId.values()));
}

function patchItems(
  prev: MediaGridItem[],
  patches: MediaGridItem[]
): MediaGridItem[] {
  if (patches.length === 0) return prev;
  const byId = new Map(patches.map((p) => [p.id, p]));
  let changed = false;
  const next = prev.map((item) => {
    const patch = byId.get(item.id);
    if (!patch) return item;
    if (
      patch.status !== item.status ||
      patch.thumbnailUrl !== item.thumbnailUrl ||
      patch.sortAt !== item.sortAt
    ) {
      changed = true;
      return patch;
    }
    return item;
  });
  return changed ? sortMediaItems(dedupeMediaById(next)) : prev;
}

function processingIdsToResolve(
  prev: MediaGridItem[],
  apiItems: MediaGridItem[]
): string[] {
  const apiById = new Map(apiItems.map((i) => [i.id, i]));
  return [
    ...new Set(
      prev
        .filter((i) => i.status === "processing")
        .filter((i) => {
          const fromApi = apiById.get(i.id);
          return !fromApi || fromApi.status === "processing";
        })
        .map((i) => i.id)
    ),
  ];
}

interface UseMediaListOptions {
  type?: "image" | "video";
  albumId?: string;
  favoritesOnly?: boolean;
}

export function useMediaList(options: UseMediaListOptions = {}) {
  const [items, setItems] = useState<MediaGridItem[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const fetchSeqRef = useRef(0);

  const fetchPage = useCallback(
    async (
      nextCursor?: string,
      append = false,
      fetchOptions?: { silent?: boolean }
    ) => {
      const seq = ++fetchSeqRef.current;
      if (!fetchOptions?.silent) setLoading(true);
      try {
        const params = new URLSearchParams();
        const opts = optionsRef.current;
        if (opts.type) params.set("type", opts.type);
        if (opts.albumId) params.set("albumId", opts.albumId);
        if (opts.favoritesOnly) params.set("favoritesOnly", "1");
        if (nextCursor) params.set("cursor", nextCursor);
        params.set("size", "60");

        const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
        const res = await fetch(`${base}/api/media?${params}`);
        const data = await res.json();

        if (seq !== fetchSeqRef.current) return;

        const apiItems = (data.items ?? []) as MediaGridItem[];
        const prev = itemsRef.current;

        let resolved: MediaGridItem[] = [];
        if (!append) {
          const ids = processingIdsToResolve(prev, apiItems);
          if (ids.length > 0) {
            resolved = await fetchMediaByIds(ids);
          }
        }

        if (seq !== fetchSeqRef.current) return;

        setItems((current) => {
          let next: MediaGridItem[];
          if (append) {
            next = sortMediaItems(dedupeMediaById([...current, ...apiItems]));
          } else if (fetchOptions?.silent) {
            next = patchItems(current, [...apiItems, ...resolved]);
          } else {
            next = patchItems(
              mergeWithOptimisticProcessing(current, apiItems),
              resolved
            );
          }
          return sortMediaItems(dedupeMediaById(next));
        });
        // 처리 중 폴링은 1페이지만 조회 — cursor를 덮어쓰면 loadMore가 중복 append 함
        if (!fetchOptions?.silent) {
          setCursor(data.nextCursor);
          setHasMore(data.hasMore ?? false);
        }
      } finally {
        if (!fetchOptions?.silent) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    setItems([]);
    setCursor(undefined);
    setHasMore(true);
    fetchPage(undefined, false);
  }, [options.type, options.albumId, options.favoritesOnly, fetchPage]);

  const setItemFavorited = useCallback(
    (mediaId: string, favorited: boolean) => {
      setItems((prev) => {
        if (optionsRef.current.favoritesOnly && !favorited) {
          return prev.filter((i) => i.id !== mediaId);
        }
        return prev.map((i) =>
          i.id === mediaId ? { ...i, favorited } : i
        );
      });
    },
    []
  );

  const loadMore = useCallback(() => {
    if (!hasMore || loading || !cursor) return;
    fetchPage(cursor, true);
  }, [hasMore, loading, cursor, fetchPage]);

  const refresh = useCallback(() => {
    fetchPage(undefined, false);
  }, [fetchPage]);

  const loadItemsForDateKey = useCallback(
    async (dateKey: string): Promise<MediaGridItem[]> => {
      const params = new URLSearchParams({ date: dateKey });
      const opts = optionsRef.current;
      if (opts.type) params.set("type", opts.type);
      if (opts.albumId) params.set("albumId", opts.albumId);

      const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
      const res = await fetch(`${base}/api/media/by-date?${params}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("해당 날짜 미디어를 불러오지 못했습니다");
      }
      const data = (await res.json()) as { items?: MediaGridItem[] };
      const apiItems = data.items ?? [];

      setItems((current) =>
        sortMediaItems(dedupeMediaById([...current, ...apiItems]))
      );
      return apiItems;
    },
    []
  );

  const prependProcessingItem = useCallback((item: MediaGridItem) => {
    flushSync(() => {
      setItems((prev) => {
        if (prev.some((i) => i.id === item.id)) return prev;
        return sortMediaItems(dedupeMediaById([item, ...prev]));
      });
    });
  }, []);

  const hasProcessing = items.some((item) => item.status === "processing");

  useEffect(() => {
    if (!hasProcessing) return;
    const interval = setInterval(() => {
      fetchPage(undefined, false, { silent: true });
    }, 3000);
    return () => clearInterval(interval);
  }, [hasProcessing, fetchPage]);

  return {
    items,
    loading,
    hasMore,
    loadMore,
    refresh,
    prependProcessingItem,
    loadItemsForDateKey,
    setItemFavorited,
  };
}

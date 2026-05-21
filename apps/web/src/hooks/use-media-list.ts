"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MediaGridItem } from "@/components/media/media-grid";

interface UseMediaListOptions {
  type?: "image" | "video";
  albumId?: string;
}

export function useMediaList(options: UseMediaListOptions = {}) {
  const [items, setItems] = useState<MediaGridItem[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const fetchPage = useCallback(
    async (nextCursor?: string, append = false) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        const opts = optionsRef.current;
        if (opts.type) params.set("type", opts.type);
        if (opts.albumId) params.set("albumId", opts.albumId);
        if (nextCursor) params.set("cursor", nextCursor);
        params.set("size", "60");

        const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
        const res = await fetch(`${base}/api/media?${params}`);
        const data = await res.json();

        setItems((prev) =>
          append ? [...prev, ...(data.items ?? [])] : data.items ?? []
        );
        setCursor(data.nextCursor);
        setHasMore(data.hasMore ?? false);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    setItems([]);
    setCursor(undefined);
    setHasMore(true);
    fetchPage(undefined, false);
  }, [options.type, options.albumId, fetchPage]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading || !cursor) return;
    fetchPage(cursor, true);
  }, [hasMore, loading, cursor, fetchPage]);

  const refresh = useCallback(() => {
    fetchPage(undefined, false);
  }, [fetchPage]);

  const hasProcessing = items.some((item) => item.status === "processing");

  useEffect(() => {
    if (!hasProcessing) return;
    const interval = setInterval(() => {
      fetchPage(undefined, false);
    }, 3000);
    return () => clearInterval(interval);
  }, [hasProcessing, fetchPage]);

  return { items, loading, hasMore, loadMore, refresh };
}

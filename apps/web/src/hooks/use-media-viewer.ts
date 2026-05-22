"use client";

import type { MediaDetailData } from "@/components/media/media-detail";
import { useMediaNav } from "@/hooks/use-media-nav";
import { getMediaNavContext } from "@/lib/media-nav-context";
import {
  collectNeighborIds,
  getPrefetchedMedia,
  prefetchAdjacentMedia,
  prefetchMediaDetail,
} from "@/lib/media-prefetch";
import { useCallback, useEffect, useMemo, useState } from "react";

export function useMediaViewer() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [media, setMedia] = useState<MediaDetailData | null>(null);
  const [loading, setLoading] = useState(false);

  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  const select = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const close = useCallback(() => {
    setSelectedId(null);
    setMedia(null);
  }, []);

  const nav = useMediaNav(selectedId, select);
  const { removeItem } = nav;

  useEffect(() => {
    if (!selectedId) {
      setMedia(null);
      return;
    }

    const cached = getPrefetchedMedia(selectedId);
    if (cached) {
      setMedia(cached);
      setLoading(false);
    } else {
      setMedia(null);
      setLoading(true);
    }

    let cancelled = false;
    prefetchMediaDetail(selectedId, base).then((data) => {
      if (cancelled) return;
      if (data) {
        setMedia(data);
        setLoading(false);
        return;
      }

      const ctx = getMediaNavContext();
      const list = ctx?.items ?? [];
      const idx = list.findIndex((item) => item.id === selectedId);
      const fallbackId =
        idx >= 0
          ? (list[idx + 1]?.id ?? list[idx - 1]?.id)
          : undefined;

      removeItem(selectedId);
      setLoading(false);
      setMedia(null);

      if (fallbackId) {
        select(fallbackId);
      } else {
        setSelectedId(null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [selectedId, base, removeItem, select]);

  const neighborIds = useMemo(
    () => collectNeighborIds(nav.items, nav.index, 2),
    [nav.items, nav.index]
  );

  useEffect(() => {
    if (!selectedId || !media) return;
    prefetchAdjacentMedia(neighborIds, base);
  }, [selectedId, media?.id, neighborIds, base]);

  return {
    selectedId,
    media,
    loading,
    open: selectedId !== null,
    select,
    close,
    ...nav,
  };
}

export type MediaViewer = ReturnType<typeof useMediaViewer>;

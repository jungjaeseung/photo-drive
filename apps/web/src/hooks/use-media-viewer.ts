"use client";

import type { MediaDetailData } from "@/components/media/media-detail";
import { useMediaNav } from "@/hooks/use-media-nav";
import {
  getPrefetchedMedia,
  prefetchAdjacentMedia,
  prefetchMediaDetail,
} from "@/lib/media-prefetch";
import { useCallback, useEffect, useState } from "react";

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
      if (!cancelled && data) setMedia(data);
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedId, base]);

  useEffect(() => {
    if (!selectedId || !media) return;
    prefetchAdjacentMedia([nav.prevId, nav.nextId], base);
  }, [selectedId, media?.id, nav.prevId, nav.nextId, base]);

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

"use client";

import type { MediaDetailData } from "@/components/media/media-detail";
import { useMediaNav } from "@/hooks/use-media-nav";
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

    let cancelled = false;
    setLoading(true);
    fetch(`${base}/api/media/${selectedId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setMedia(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId, base]);

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

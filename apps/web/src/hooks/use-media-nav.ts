"use client";

import {
  getMediaNavContext,
  updateMediaNavCurrentId,
  type MediaNavItem,
} from "@/lib/media-nav-context";
import { useCallback, useEffect, useMemo, useState } from "react";

export function useMediaNav(
  currentId: string | null,
  onNavigate: (id: string) => void
) {
  const [items, setItems] = useState<MediaNavItem[]>([]);

  useEffect(() => {
    const ctx = getMediaNavContext();
    setItems(ctx?.items ?? []);
    if (currentId) {
      updateMediaNavCurrentId(currentId);
    }
  }, [currentId]);

  const index = useMemo(
    () => (currentId ? items.findIndex((item) => item.id === currentId) : -1),
    [items, currentId]
  );

  const prevId = index > 0 ? items[index - 1]?.id : undefined;
  const nextId =
    index >= 0 && index < items.length - 1
      ? items[index + 1]?.id
      : undefined;

  const goTo = useCallback(
    (id: string) => {
      updateMediaNavCurrentId(id);
      onNavigate(id);
    },
    [onNavigate]
  );

  const goPrev = useCallback(() => {
    if (prevId) goTo(prevId);
  }, [prevId, goTo]);

  const goNext = useCallback(() => {
    if (nextId) goTo(nextId);
  }, [nextId, goTo]);

  return {
    items,
    index,
    prevId,
    nextId,
    hasNav: items.length > 1 && index >= 0,
    goTo,
    goPrev,
    goNext,
  };
}

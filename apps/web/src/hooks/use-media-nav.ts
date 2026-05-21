"use client";

import {
  getMediaNavContext,
  updateMediaNavCurrentId,
  type MediaNavItem,
} from "@/lib/media-nav-context";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export function useMediaNav(currentId: string) {
  const router = useRouter();
  const [items, setItems] = useState<MediaNavItem[]>([]);

  useEffect(() => {
    const ctx = getMediaNavContext();
    setItems(ctx?.items ?? []);
    updateMediaNavCurrentId(currentId);
  }, [currentId]);

  const index = useMemo(
    () => items.findIndex((item) => item.id === currentId),
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
      router.push(`/p/${id}`);
    },
    [router]
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

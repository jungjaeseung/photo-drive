"use client";

import {
  getFavoritesOnly,
  setFavoritesOnly,
} from "@/lib/favorites-filter";
import { useCallback, useEffect, useState } from "react";

export function useFavoritesFilter() {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setEnabled(getFavoritesOnly());
    setReady(true);
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      setFavoritesOnly(next);
      return next;
    });
  }, []);

  return {
    favoritesOnly: ready && enabled,
    favoritesFilter: enabled,
    filterReady: ready,
    toggle,
  };
}

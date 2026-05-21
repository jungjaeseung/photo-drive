"use client";

import type { MediaGridItem } from "@/components/media/media-grid";
import { useGridMode } from "@/hooks/use-grid-mode";
import { useCallback } from "react";

export function useMediaGridInteraction() {
  const gridMode = useGridMode();

  const handleLongPress = useCallback(
    (item: MediaGridItem) => {
      gridMode.enterSelectMode();
      gridMode.selectOne(item.id);
    },
    [gridMode]
  );

  return { gridMode, handleLongPress };
}

"use client";

import type { MediaGridItem } from "@/components/media/media-grid";
import { useGridMode } from "@/hooks/use-grid-mode";
import { useCallback, useRef, useState } from "react";

interface UseMediaGridInteractionOptions {
  loadItemsForDateKey?: (dateKey: string) => Promise<MediaGridItem[]>;
}

export function useMediaGridInteraction(
  options: UseMediaGridInteractionOptions = {}
) {
  const gridMode = useGridMode();
  const [loadingDateKey, setLoadingDateKey] = useState<string | null>(null);
  const selectedIdsRef = useRef(gridMode.selectedIds);
  selectedIdsRef.current = gridMode.selectedIds;

  const handleLongPress = useCallback(
    (item: MediaGridItem) => {
      gridMode.enterSelectMode();
      gridMode.selectOne(item.id);
    },
    [gridMode]
  );

  const handleToggleDateGroup = useCallback(
    async (dateKey: string, loadedIds: string[]) => {
      if (options.loadItemsForDateKey) {
        setLoadingDateKey(dateKey);
        try {
          const items = await options.loadItemsForDateKey(dateKey);
          const ids = items.map((i) => i.id);
          if (!ids.length) return;
          const selected = selectedIdsRef.current;
          const allSelected = ids.every((id) => selected.has(id));
          if (allSelected) gridMode.deselectMany(ids);
          else gridMode.selectMany(ids);
        } catch (e) {
          alert(e instanceof Error ? e.message : String(e));
        } finally {
          setLoadingDateKey(null);
        }
        return;
      }

      gridMode.toggleGroup(loadedIds);
    },
    [gridMode, options.loadItemsForDateKey]
  );

  return {
    gridMode,
    handleLongPress,
    handleToggleDateGroup,
    loadingDateKey,
  };
}

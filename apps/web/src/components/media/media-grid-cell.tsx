"use client";

import type { GridMode } from "@/hooks/use-grid-mode";
import { setMediaNavContext } from "@/lib/media-nav-context";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { FavoriteHeartButton } from "@/components/media/favorite-heart-button";
import { setFavorite } from "@/lib/favorite-api";
import type { MediaGridItem } from "./media-grid";
import { ProgressiveImage } from "./progressive-image";
import { SelectionCheck } from "./selection-check";

const LONG_PRESS_MS = 500;
const MOVE_THRESHOLD = 10;

interface MediaGridCellProps {
  item: MediaGridItem;
  mode: GridMode;
  selected: boolean;
  orderedItems: MediaGridItem[];
  suppressClickRef?: React.RefObject<boolean>;
  onSelect?: (item: MediaGridItem) => void;
  onToggleSelect?: (id: string) => void;
  onLongPress?: (item: MediaGridItem) => void;
  onFavoritedChange?: (mediaId: string, favorited: boolean) => void;
}

export function MediaGridCell({
  item,
  mode,
  selected,
  orderedItems,
  suppressClickRef,
  onSelect,
  onToggleSelect,
  onLongPress,
  onFavoritedChange,
}: MediaGridCellProps) {
  const [favorited, setFavorited] = useState(!!item.favorited);
  const [togglingFavorite, setTogglingFavorite] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setFavorited(!!item.favorited);
  }, [item.id, item.favorited]);
  const longPressFiredRef = useRef(false);

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (mode === "select") return;
    longPressFiredRef.current = false;
    startRef.current = { x: e.clientX, y: e.clientY };
    clearTimer();
    timerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      onLongPress?.(item);
    }, LONG_PRESS_MS);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!startRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (Math.hypot(dx, dy) > MOVE_THRESHOLD) clearTimer();
  }

  function handlePointerUp() {
    clearTimer();
    startRef.current = null;
  }

  function handleClick() {
    if (suppressClickRef?.current) return;
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      return;
    }

    if (mode === "select") {
      onToggleSelect?.(item.id);
      return;
    }

    setMediaNavContext(
      orderedItems.map((i) => ({
        id: i.id,
        thumbnailUrl: i.thumbnailUrl,
      })),
      item.id
    );
    onSelect?.(item);
  }

  return (
    <button
      type="button"
      data-media-id={item.id}
      className={cn(
        "relative aspect-square overflow-hidden bg-zinc-100 dark:bg-zinc-900",
        selected && "ring-2 ring-inset ring-blue-500"
      )}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <ProgressiveImage
        thumbSrc={item.thumbnailUrl}
        mainSrc={item.thumbnailUrl}
        alt=""
        className="aspect-square"
      />
      {item.type === "video" && (
        <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 text-[10px] text-white">
          {item.duration
            ? `${Math.floor(item.duration / 60)}:${String(
                Math.floor(item.duration % 60)
              ).padStart(2, "0")}`
            : "VIDEO"}
        </span>
      )}
      {item.status === "processing" && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs text-white">
          처리 중
        </span>
      )}
      {item.status !== "processing" && mode !== "select" && (
        <span className="absolute bottom-1 left-1">
          <FavoriteHeartButton
            favorited={favorited}
            size="sm"
            stopPropagation
            onToggle={() => {
              if (togglingFavorite) return;
              const next = !favorited;
              setFavorited(next);
              setTogglingFavorite(true);
              void setFavorite(item.id, next)
                .then((ok) => {
                  setFavorited(ok);
                  onFavoritedChange?.(item.id, ok);
                })
                .catch(() => setFavorited(favorited))
                .finally(() => setTogglingFavorite(false));
            }}
          />
        </span>
      )}
      {mode === "select" && (
        <span className="absolute right-1 top-1">
          <SelectionCheck selected={selected} />
        </span>
      )}
    </button>
  );
}

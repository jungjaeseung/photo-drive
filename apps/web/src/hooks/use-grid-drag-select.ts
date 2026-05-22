"use client";

import { useCallback, useRef } from "react";

type DragAction = "select" | "deselect";

const DRAG_THRESHOLD_PX = 8;

interface DragState {
  action: DragAction;
  startId: string;
  touched: Set<string>;
  moved: boolean;
  captured: boolean;
  startX: number;
  startY: number;
}

function mediaIdFromPoint(x: number, y: number): string | null {
  const el = document.elementFromPoint(x, y)?.closest("[data-media-id]");
  return el?.getAttribute("data-media-id") ?? null;
}

interface UseGridDragSelectOptions {
  enabled: boolean;
  selectedIds?: Set<string>;
  onSelectMany: (ids: string[]) => void;
  onDeselectMany: (ids: string[]) => void;
}

export function useGridDragSelect({
  enabled,
  selectedIds,
  onSelectMany,
  onDeselectMany,
}: UseGridDragSelectOptions) {
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);

  const applyToId = useCallback(
    (id: string, action: DragAction) => {
      if (action === "select") {
        if (!selectedIds?.has(id)) onSelectMany([id]);
      } else if (selectedIds?.has(id)) {
        onDeselectMany([id]);
      }
    },
    [selectedIds, onSelectMany, onDeselectMany]
  );

  const finishDrag = useCallback((pointerId: number, target: HTMLElement | null) => {
    const drag = dragRef.current;
    if (drag?.moved) {
      suppressClickRef.current = true;
      queueMicrotask(() => {
        suppressClickRef.current = false;
      });
    }
    if (drag?.captured) {
      target?.releasePointerCapture?.(pointerId);
    }
    dragRef.current = null;
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled || e.button !== 0) return;
      const id = mediaIdFromPoint(e.clientX, e.clientY);
      if (!id) return;

      const action: DragAction = selectedIds?.has(id) ? "deselect" : "select";
      dragRef.current = {
        action,
        startId: id,
        touched: new Set(),
        moved: false,
        captured: false,
        startX: e.clientX,
        startY: e.clientY,
      };
    },
    [enabled, selectedIds]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag) return;

      if (!drag.moved) {
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
        drag.moved = true;
        drag.captured = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.touched.add(drag.startId);
        applyToId(drag.startId, drag.action);
      }

      const id = mediaIdFromPoint(e.clientX, e.clientY);
      if (!id || drag.touched.has(id)) return;

      drag.touched.add(id);
      applyToId(id, drag.action);
    },
    [applyToId]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragRef.current) return;
      finishDrag(e.pointerId, e.currentTarget);
    },
    [finishDrag]
  );

  const onPointerCancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragRef.current) return;
      finishDrag(e.pointerId, e.currentTarget);
    },
    [finishDrag]
  );

  return {
    suppressClickRef,
    dragPointerHandlers: enabled
      ? {
          onPointerDown,
          onPointerMove,
          onPointerUp,
          onPointerCancel,
        }
      : {},
  };
}

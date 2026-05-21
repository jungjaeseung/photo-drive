"use client";

import { useCallback, useEffect, useState } from "react";

export type GridMode = "detail" | "select";

const STORAGE_KEY = "photo-drive-grid-mode";

export function useGridMode() {
  const [mode, setModeState] = useState<GridMode>("detail");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === "detail" || stored === "select") {
      setModeState(stored);
    }
  }, []);

  const setMode = useCallback((next: GridMode) => {
    setModeState(next);
    sessionStorage.setItem(STORAGE_KEY, next);
    if (next === "detail") {
      setSelectedIds(new Set());
    }
  }, []);

  const enterSelectMode = useCallback(() => {
    setMode("select");
  }, [setMode]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectOne = useCallback((id: string) => {
    setSelectedIds(new Set([id]));
  }, []);

  return {
    mode,
    setMode,
    selectedIds,
    toggleSelect,
    selectOne,
    clearSelection,
    enterSelectMode,
    selectedCount: selectedIds.size,
  };
}

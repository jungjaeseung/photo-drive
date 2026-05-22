"use client";

import type { MediaGridItem } from "@/components/media/media-grid";
import { fetchMediaByIds } from "@/lib/media-by-id";
import { buildProcessingGridItem } from "@/lib/upload-client";
import { uploadMediaFile } from "@/lib/upload-xhr";
import { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";

export type UploadQueueStatus =
  | "pending"
  | "uploading"
  | "processing"
  | "complete"
  | "error";

export interface UploadQueueItem {
  id: string;
  file: File;
  fileName: string;
  fileSize: number;
  status: UploadQueueStatus;
  progress?: number;
  mediaId?: string;
  errorMessage?: string;
  uploadBatchId?: string;
}

const STATUS_RANK: Record<UploadQueueStatus, number> = {
  uploading: 0,
  processing: 0,
  pending: 1,
  complete: 2,
  error: 2,
};

export function sortUploadQueueItems(
  items: UploadQueueItem[]
): UploadQueueItem[] {
  return [...items].sort((a, b) => {
    const rankDiff = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (rankDiff !== 0) return rankDiff;
    return 0;
  });
}

function isActiveStatus(status: UploadQueueStatus): boolean {
  return status === "pending" || status === "uploading" || status === "processing";
}

interface UseUploadQueueOptions {
  onItemUploaded?: (item: MediaGridItem) => void;
  onUploaded?: () => void;
}

export function useUploadQueue(options: UseUploadQueueOptions = {}) {
  const [items, setItems] = useState<UploadQueueItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const workerRunningRef = useRef(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const wasActiveRef = useRef(false);
  const notifiedBatchesRef = useRef<Set<string>>(new Set());

  const isActive = items.some((i) => isActiveStatus(i.status));

  const sortedItems = sortUploadQueueItems(items);

  const updateItem = useCallback(
    (id: string, patch: Partial<UploadQueueItem>) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
      );
    },
    []
  );

  const enqueue = useCallback((files: File[]) => {
    if (files.length === 0) return;
    const uploadBatchId = uuidv4();
    const newItems: UploadQueueItem[] = files.map((file) => ({
      id: uuidv4(),
      file,
      fileName: file.name,
      fileSize: file.size,
      status: "pending",
      uploadBatchId,
    }));
    setItems((prev) => [...prev, ...newItems]);
    // 파일 피커 닫힘 직후 pointer 이벤트가 outside-click으로 잡혀 Drawer가 바로 닫히는 것 방지
    window.setTimeout(() => setDrawerOpen(true), 150);
  }, []);

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
  }, []);

  const runWorker = useCallback(async () => {
    if (workerRunningRef.current) return;
    workerRunningRef.current = true;

    try {
      while (true) {
        const pending = itemsRef.current.find((i) => i.status === "pending");
        if (!pending) break;

        updateItem(pending.id, { status: "uploading", progress: 0 });

        try {
          const result = await uploadMediaFile(pending.file, {
            uploadBatchId: pending.uploadBatchId,
            onProgress: (percent) => {
              updateItem(pending.id, { progress: percent });
            },
          });

          if (!result.ok) {
            if (result.duplicate) {
              updateItem(pending.id, {
                status: "complete",
                progress: undefined,
                errorMessage: "이미 존재하는 파일",
              });
            } else {
              updateItem(pending.id, {
                status: "error",
                progress: undefined,
                errorMessage: result.message,
              });
            }
            continue;
          }

          const { mediaId } = result;
          optionsRef.current.onItemUploaded?.(
            buildProcessingGridItem(pending.file, mediaId)
          );
          updateItem(pending.id, {
            status: "processing",
            progress: undefined,
            mediaId,
          });
        } catch (e) {
          updateItem(pending.id, {
            status: "error",
            progress: undefined,
            errorMessage: String(e),
          });
        }
      }
    } finally {
      workerRunningRef.current = false;
      const stillPending = itemsRef.current.some((i) => i.status === "pending");
      if (stillPending) void runWorker();
    }
  }, [updateItem]);

  useEffect(() => {
    const hasPending = items.some((i) => i.status === "pending");
    if (hasPending) void runWorker();
  }, [items, runWorker]);

  const processingMediaKey = items
    .filter((i) => i.status === "processing" && i.mediaId)
    .map((i) => i.mediaId)
    .join(",");

  useEffect(() => {
    if (!processingMediaKey) return;

    let cancelled = false;

    async function poll() {
      const current = itemsRef.current.filter(
        (i) => i.status === "processing" && i.mediaId
      );
      if (current.length === 0) return;

      const ids = current.map((i) => i.mediaId!);
      const docs = await fetchMediaByIds(ids);
      if (cancelled) return;

      for (const doc of docs) {
        const queueItem = current.find((i) => i.mediaId === doc.id);
        if (!queueItem) continue;

        if (doc.status === "ready") {
          updateItem(queueItem.id, { status: "complete" });
        } else if (doc.status === "failed") {
          updateItem(queueItem.id, {
            status: "error",
            errorMessage: "처리 실패",
          });
        }
      }
    }

    void poll();
    const interval = setInterval(() => void poll(), 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [processingMediaKey, updateItem]);

  useEffect(() => {
    if (wasActiveRef.current && !isActive) {
      optionsRef.current.onUploaded?.();
    }
    wasActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    const batchIds = [
      ...new Set(
        items.map((i) => i.uploadBatchId).filter((id): id is string => !!id)
      ),
    ];

    for (const batchId of batchIds) {
      if (notifiedBatchesRef.current.has(batchId)) continue;

      const batchItems = items.filter((i) => i.uploadBatchId === batchId);
      if (batchItems.length === 0) continue;
      if (batchItems.some((i) => isActiveStatus(i.status))) continue;

      const successCount = batchItems.filter(
        (i) => i.status === "complete" && i.mediaId
      ).length;

      notifiedBatchesRef.current.add(batchId);

      if (successCount === 0) continue;

      void fetch(`${base}/api/push/batch-complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId, count: successCount }),
      }).catch(() => {});
    }
  }, [items]);

  const activeCount = items.filter((i) => isActiveStatus(i.status)).length;
  const totalCount = items.length;

  return {
    items: sortedItems,
    enqueue,
    isActive,
    drawerOpen,
    setDrawerOpen,
    openDrawer,
    activeCount,
    totalCount,
  };
}

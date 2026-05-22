"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const ROTATION_MS = 5000;

type PreviewResponse = {
  photoThumbnailUrl?: string;
  videoThumbnailUrl?: string;
  photoMediaId?: string;
  videoMediaId?: string;
};

export function useCategoryPreviewRotation() {
  const [photoThumb, setPhotoThumb] = useState<string | undefined>();
  const [videoThumb, setVideoThumb] = useState<string | undefined>();
  const [photoMediaId, setPhotoMediaId] = useState<string | undefined>();
  const [videoMediaId, setVideoMediaId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  const lastPhotoIdRef = useRef<string | undefined>(undefined);
  const lastVideoIdRef = useRef<string | undefined>(undefined);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  const applyPreview = useCallback((data: PreviewResponse) => {
    setPhotoThumb(data.photoThumbnailUrl);
    setVideoThumb(data.videoThumbnailUrl);
    setPhotoMediaId(data.photoMediaId);
    setVideoMediaId(data.videoMediaId);
    lastPhotoIdRef.current = data.photoMediaId;
    lastVideoIdRef.current = data.videoMediaId;
  }, []);

  const fetchPreviews = useCallback(
    async (retry = true) => {
      const res = await fetch(`${base}/api/collections/category-previews`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as PreviewResponse;

      const samePhoto =
        data.photoMediaId &&
        data.photoMediaId === lastPhotoIdRef.current;
      const sameVideo =
        data.videoMediaId &&
        data.videoMediaId === lastVideoIdRef.current;

      if (retry && (samePhoto || sameVideo)) {
        const retryRes = await fetch(
          `${base}/api/collections/category-previews`,
          { cache: "no-store" }
        );
        if (retryRes.ok) {
          const retryData = (await retryRes.json()) as PreviewResponse;
          applyPreview(retryData);
          return;
        }
      }

      applyPreview(data);
    },
    [base, applyPreview]
  );

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startInterval = useCallback(() => {
    stopInterval();
    intervalRef.current = setInterval(() => {
      void fetchPreviews();
    }, ROTATION_MS);
  }, [stopInterval, fetchPreviews]);

  const refresh = useCallback(async () => {
    await fetchPreviews();
    if (!document.hidden) startInterval();
  }, [fetchPreviews, startInterval]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await fetchPreviews();
      if (!cancelled) {
        setIsLoading(false);
        if (!document.hidden) startInterval();
      }
    })();

    const onVisibility = () => {
      if (document.hidden) {
        stopInterval();
      } else {
        void fetchPreviews().then(() => startInterval());
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      stopInterval();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchPreviews, startInterval, stopInterval]);

  return {
    photoThumb,
    videoThumb,
    photoMediaId,
    videoMediaId,
    isLoading,
    refresh,
  };
}

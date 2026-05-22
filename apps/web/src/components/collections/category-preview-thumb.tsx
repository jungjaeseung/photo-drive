"use client";

import {
  getCachedMediaImageUrl,
  resolveMediaImage,
} from "@/lib/media-image-cache";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface CategoryPreviewThumbProps {
  src?: string;
  fallbackIcon: LucideIcon;
  className?: string;
}

const FADE_MS = 650;

function useResolvedSrc(url?: string) {
  const [resolved, setResolved] = useState<string | undefined>(() =>
    url ? getCachedMediaImageUrl(url) : undefined
  );

  useEffect(() => {
    if (!url) {
      setResolved(undefined);
      return;
    }

    const cached = getCachedMediaImageUrl(url);
    if (cached) {
      setResolved(cached);
      return;
    }

    let cancelled = false;
    resolveMediaImage(url)
      .then((blobUrl) => {
        if (!cancelled) setResolved(blobUrl);
      })
      .catch(() => {
        if (!cancelled) setResolved(url);
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return resolved;
}

function CrossfadeLayer({
  url,
  visible,
}: {
  url: string;
  visible: boolean;
}) {
  const resolved = useResolvedSrc(url);

  if (!resolved) {
    return (
      <div
        className={cn(
          "absolute inset-0 bg-zinc-200 transition-opacity ease-in-out dark:bg-zinc-800",
          visible ? "opacity-100" : "opacity-0"
        )}
        style={{ transitionDuration: `${FADE_MS}ms` }}
        aria-hidden
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolved}
      alt=""
      decoding="async"
      draggable={false}
      className={cn(
        "absolute inset-0 h-full w-full object-cover transition-opacity ease-in-out",
        visible ? "opacity-100" : "opacity-0"
      )}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    />
  );
}

/** 다음 프레임에 opacity 전환이 적용되도록 두 번 rAF */
function afterPaint(fn: () => void) {
  requestAnimationFrame(() => {
    requestAnimationFrame(fn);
  });
}

export function CategoryPreviewThumb({
  src,
  fallbackIcon: Icon,
  className,
}: CategoryPreviewThumbProps) {
  const [baseUrl, setBaseUrl] = useState<string | undefined>(src);
  const [overlayUrl, setOverlayUrl] = useState<string | undefined>();
  const [overlayVisible, setOverlayVisible] = useState(false);
  const transitionGenRef = useRef(0);

  useEffect(() => {
    if (!src) {
      setBaseUrl(undefined);
      setOverlayUrl(undefined);
      setOverlayVisible(false);
      return;
    }

    if (!baseUrl) {
      setBaseUrl(src);
      return;
    }

    const visibleSrc =
      overlayVisible && overlayUrl ? overlayUrl : baseUrl;
    if (src === visibleSrc) return;

    if (overlayUrl === src && !overlayVisible) {
      const gen = transitionGenRef.current;
      afterPaint(() => {
        if (transitionGenRef.current !== gen) return;
        setOverlayVisible(true);
      });
      return;
    }

    const gen = ++transitionGenRef.current;
    const img = new Image();

    const revealOverlay = () => {
      if (transitionGenRef.current !== gen) return;
      setOverlayUrl(src);
      setOverlayVisible(false);
      afterPaint(() => {
        if (transitionGenRef.current !== gen) return;
        setOverlayVisible(true);
      });
    };

    img.onload = revealOverlay;
    img.onerror = revealOverlay;

    const cached = getCachedMediaImageUrl(src);
    img.src = cached ?? src;
    if (img.complete) revealOverlay();

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, baseUrl, overlayUrl, overlayVisible]);

  useEffect(() => {
    if (!overlayUrl || !overlayVisible) return;

    const t = window.setTimeout(() => {
      setBaseUrl(overlayUrl);
      setOverlayUrl(undefined);
      setOverlayVisible(false);
    }, FADE_MS);

    return () => window.clearTimeout(t);
  }, [overlayUrl, overlayVisible]);

  if (!baseUrl && !overlayUrl) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center",
          className
        )}
      >
        <Icon className="h-12 w-12 text-blue-500/80" />
      </div>
    );
  }

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      {baseUrl ? <CrossfadeLayer url={baseUrl} visible /> : null}
      {overlayUrl ? (
        <CrossfadeLayer url={overlayUrl} visible={overlayVisible} />
      ) : null}
    </div>
  );
}

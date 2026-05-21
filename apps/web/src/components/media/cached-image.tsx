"use client";

import {
  getCachedMediaImageUrl,
  hasCachedMediaImage,
  resolveMediaImage,
} from "@/lib/media-image-cache";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface CachedImageProps {
  src?: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
  draggable?: boolean;
  onLoad?: () => void;
}

export function CachedImage({
  src,
  alt,
  className,
  loading = "lazy",
  draggable,
  onLoad,
}: CachedImageProps) {
  const [displaySrc, setDisplaySrc] = useState<string | undefined>(() =>
    getCachedMediaImageUrl(src)
  );
  const [visible, setVisible] = useState(() => hasCachedMediaImage(src));

  useEffect(() => {
    if (!src) {
      setDisplaySrc(undefined);
      setVisible(false);
      return;
    }

    const cached = getCachedMediaImageUrl(src);
    if (cached) {
      setDisplaySrc(cached);
      setVisible(true);
      onLoad?.();
      return;
    }

    setVisible(false);
    let cancelled = false;
    resolveMediaImage(src)
      .then((url) => {
        if (cancelled) return;
        setDisplaySrc(url);
        setVisible(true);
        onLoad?.();
      })
      .catch(() => {
        if (!cancelled) {
          setDisplaySrc(src);
          setVisible(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!src || !displaySrc) {
    return (
      <div className={cn("bg-zinc-200 dark:bg-zinc-800", className)} aria-hidden />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={displaySrc}
      alt={alt}
      loading={loading}
      decoding="async"
      draggable={draggable}
      className={cn(
        className,
        visible ? "opacity-100" : "opacity-0"
      )}
      onLoad={() => {
        setVisible(true);
        onLoad?.();
      }}
    />
  );
}

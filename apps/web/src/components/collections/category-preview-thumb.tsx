"use client";

import { CachedImage } from "@/components/media/cached-image";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

interface CategoryPreviewThumbProps {
  src?: string;
  fallbackIcon: LucideIcon;
  className?: string;
}

const FADE_MS = 500;

export function CategoryPreviewThumb({
  src,
  fallbackIcon: Icon,
  className,
}: CategoryPreviewThumbProps) {
  const [current, setCurrent] = useState<string | undefined>(src);
  const [next, setNext] = useState<string | undefined>();
  const [nextVisible, setNextVisible] = useState(false);

  useEffect(() => {
    if (!src) {
      setCurrent(undefined);
      setNext(undefined);
      setNextVisible(false);
      return;
    }

    if (src === current && !next) {
      if (current !== src) setCurrent(src);
      return;
    }

    if (src === current || src === next) return;

    let cancelled = false;
    const img = new Image();

    img.onload = () => {
      if (cancelled) return;
      setNext(src);
      setNextVisible(false);
      requestAnimationFrame(() => {
        if (!cancelled) setNextVisible(true);
      });
    };

    img.onerror = () => {
      if (!cancelled) {
        setCurrent(src);
        setNext(undefined);
        setNextVisible(false);
      }
    };

    img.src = src;

    return () => {
      cancelled = true;
    };
  }, [src, current, next]);

  useEffect(() => {
    if (!next || !nextVisible) return;

    const t = window.setTimeout(() => {
      setCurrent(next);
      setNext(undefined);
      setNextVisible(false);
    }, FADE_MS);

    return () => window.clearTimeout(t);
  }, [next, nextVisible]);

  if (!current && !next) {
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
    <div className={cn("relative h-full w-full", className)}>
      {current ? (
        <CachedImage
          src={current}
          alt=""
          loading="eager"
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      {next ? (
        <CachedImage
          src={next}
          alt=""
          loading="eager"
          draggable={false}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
            nextVisible ? "opacity-100" : "opacity-0"
          )}
        />
      ) : null}
    </div>
  );
}

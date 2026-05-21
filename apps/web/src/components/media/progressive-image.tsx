"use client";

import { CachedImage } from "@/components/media/cached-image";
import { hasCachedMediaImage } from "@/lib/media-image-cache";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface ProgressiveImageProps {
  thumbSrc?: string;
  mainSrc?: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}

export function ProgressiveImage({
  thumbSrc,
  mainSrc,
  alt,
  className,
  onClick,
}: ProgressiveImageProps) {
  const src = mainSrc ?? thumbSrc;
  const [loaded, setLoaded] = useState(() => hasCachedMediaImage(src));

  useEffect(() => {
    setLoaded(hasCachedMediaImage(src));
  }, [src]);

  if (!src) {
    return (
      <div
        className={cn("bg-zinc-200 dark:bg-zinc-800", className)}
        onClick={onClick}
      />
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)} onClick={onClick}>
      {thumbSrc && thumbSrc !== mainSrc && !loaded && (
        <CachedImage
          src={thumbSrc}
          alt=""
          className="absolute inset-0 h-full w-full scale-105 object-cover blur-md"
        />
      )}
      <CachedImage
        src={src}
        alt={alt}
        className={cn(
          "h-full w-full object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0"
        )}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}

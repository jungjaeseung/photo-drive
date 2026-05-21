"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";

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
  const [loaded, setLoaded] = useState(false);
  const src = mainSrc ?? thumbSrc;

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
      {thumbSrc && thumbSrc !== mainSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbSrc}
          alt=""
          aria-hidden
          className={cn(
            "absolute inset-0 h-full w-full object-cover blur-md scale-105 transition-opacity",
            loaded ? "opacity-0" : "opacity-100"
          )}
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={cn(
          "h-full w-full object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";
import { Heart } from "lucide-react";

interface FavoriteHeartButtonProps {
  favorited: boolean;
  onToggle: () => void;
  className?: string;
  size?: "sm" | "md";
  /** 그리드 셀 등 — 클릭이 상위로 전파되지 않게 */
  stopPropagation?: boolean;
}

export function FavoriteHeartButton({
  favorited,
  onToggle,
  className,
  size = "md",
  stopPropagation = false,
}: FavoriteHeartButtonProps) {
  const iconClass = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";

  return (
    <button
      type="button"
      aria-label={favorited ? "즐겨찾기 해제" : "즐겨찾기"}
      aria-pressed={favorited}
      className={cn(
        "inline-flex items-center justify-center rounded-full transition-colors",
        size === "sm"
          ? "h-7 w-7 bg-black/45 text-white hover:bg-black/60"
          : "h-9 w-9 bg-zinc-800 text-white hover:bg-zinc-700",
        className
      )}
      onClick={(e) => {
        if (stopPropagation) {
          e.preventDefault();
          e.stopPropagation();
        }
        onToggle();
      }}
    >
      <Heart
        className={cn(
          iconClass,
          favorited ? "fill-red-500 text-red-500" : "fill-none text-white"
        )}
      />
    </button>
  );
}

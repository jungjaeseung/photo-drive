"use client";

import { cn } from "@/lib/utils";
import { Heart } from "lucide-react";

interface FavoritesFilterToggleProps {
  active: boolean;
  onToggle: () => void;
  className?: string;
}

export function FavoritesFilterToggle({
  active,
  onToggle,
  className,
}: FavoritesFilterToggleProps) {
  return (
    <button
      type="button"
      aria-label={active ? "전체 목록 보기" : "즐겨찾기만 보기"}
      aria-pressed={active}
      onClick={onToggle}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors",
        active
          ? "border-red-200 bg-red-50 text-red-500 dark:border-red-900 dark:bg-red-950/40"
          : "border-zinc-200 text-zinc-500 dark:border-zinc-700",
        className
      )}
    >
      <Heart
        className={cn("h-5 w-5", active && "fill-red-500 text-red-500")}
      />
    </button>
  );
}

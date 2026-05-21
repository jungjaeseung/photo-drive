"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface SelectionCheckProps {
  selected: boolean;
  partial?: boolean;
  className?: string;
}

export function SelectionCheck({
  selected,
  partial = false,
  className,
}: SelectionCheckProps) {
  return (
    <span
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
        selected
          ? "border-blue-500 bg-blue-500 text-white"
          : partial
            ? "border-blue-500 bg-blue-500/30"
            : "border-zinc-400/80 bg-white/90 dark:border-zinc-500 dark:bg-zinc-800/90",
        className
      )}
    >
      {selected && <Check className="h-3 w-3" />}
      {partial && !selected && (
        <span className="h-2 w-2 rounded-full bg-blue-500" />
      )}
    </span>
  );
}

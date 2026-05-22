"use client";

import { useEffect } from "react";

/** 터치 후 남는 :focus 링 제거 (입력 필드 제외) */
export function TouchFocusBlur() {
  useEffect(() => {
    const onTouchEnd = () => {
      const el = document.activeElement;
      if (
        el instanceof HTMLElement &&
        el !== document.body &&
        !el.matches(
          "input, textarea, select, [contenteditable='true'], [contenteditable='']"
        )
      ) {
        el.blur();
      }
    };

    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => document.removeEventListener("touchend", onTouchEnd);
  }, []);

  return null;
}

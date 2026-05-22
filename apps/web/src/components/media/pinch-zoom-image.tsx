"use client";

import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";

const MIN_SWIPE_PX = 56;
const MIN_SCALE = 1;
const MAX_SCALE = 4;

function touchDistance(touches: TouchList): number {
  if (touches.length < 2) return 0;
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

interface PinchZoomImageProps {
  previewSrc?: string;
  originalSrc?: string;
  originalReady?: boolean;
  alt: string;
  className?: string;
  onSwipePrev?: () => void;
  onSwipeNext?: () => void;
}

export function PinchZoomImage({
  previewSrc,
  originalSrc,
  originalReady = false,
  alt,
  className,
  onSwipePrev,
  onSwipeNext,
}: PinchZoomImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(MIN_SCALE);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });

  const scaleRef = useRef(MIN_SCALE);
  const translateRef = useRef({ x: 0, y: 0 });
  const gestureHadMultiTouch = useRef(false);
  const pinchStartDistance = useRef<number | null>(null);
  const pinchStartScale = useRef(MIN_SCALE);
  const panStart = useRef<{
    x: number;
    y: number;
    tx: number;
    ty: number;
  } | null>(null);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  const resetTransform = useCallback(() => {
    scaleRef.current = MIN_SCALE;
    translateRef.current = { x: 0, y: 0 };
    setScale(MIN_SCALE);
    setTranslate({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    resetTransform();
  }, [previewSrc, originalSrc, resetTransform]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        gestureHadMultiTouch.current = true;
        swipeStart.current = null;
        panStart.current = null;
        pinchStartDistance.current = touchDistance(e.touches);
        pinchStartScale.current = scaleRef.current;
        return;
      }

      if (e.touches.length !== 1) return;

      const { clientX, clientY } = e.touches[0];
      if (scaleRef.current > MIN_SCALE + 0.02) {
        panStart.current = {
          x: clientX,
          y: clientY,
          tx: translateRef.current.x,
          ty: translateRef.current.y,
        };
        swipeStart.current = null;
      } else {
        swipeStart.current = { x: clientX, y: clientY };
        panStart.current = null;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        gestureHadMultiTouch.current = true;
        swipeStart.current = null;
        panStart.current = null;

        const startDist = pinchStartDistance.current;
        if (!startDist || startDist < 1) return;

        e.preventDefault();
        const dist = touchDistance(e.touches);
        const next = Math.min(
          MAX_SCALE,
          Math.max(MIN_SCALE, (pinchStartScale.current * dist) / startDist)
        );
        scaleRef.current = next;
        setScale(next);
        if (next <= MIN_SCALE + 0.02) {
          translateRef.current = { x: 0, y: 0 };
          setTranslate({ x: 0, y: 0 });
        }
        return;
      }

      if (e.touches.length !== 1) return;

      if (panStart.current && scaleRef.current > MIN_SCALE + 0.02) {
        e.preventDefault();
        const dx = e.touches[0].clientX - panStart.current.x;
        const dy = e.touches[0].clientY - panStart.current.y;
        const next = {
          x: panStart.current.tx + dx,
          y: panStart.current.ty + dy,
        };
        translateRef.current = next;
        setTranslate(next);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length > 0) return;

      if (gestureHadMultiTouch.current) {
        gestureHadMultiTouch.current = false;
        pinchStartDistance.current = null;
        panStart.current = null;
        swipeStart.current = null;
        if (scaleRef.current <= MIN_SCALE + 0.02) resetTransform();
        return;
      }

      if (panStart.current) {
        panStart.current = null;
        return;
      }

      const start = swipeStart.current;
      swipeStart.current = null;
      pinchStartDistance.current = null;

      if (!start || scaleRef.current > MIN_SCALE + 0.02) return;

      const touch = e.changedTouches[0];
      if (!touch) return;

      const diffX = touch.clientX - start.x;
      const diffY = touch.clientY - start.y;

      if (
        Math.abs(diffX) >= MIN_SWIPE_PX &&
        Math.abs(diffX) > Math.abs(diffY) * 1.25
      ) {
        if (diffX > 0) onSwipePrev?.();
        else onSwipeNext?.();
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [onSwipePrev, onSwipeNext, resetTransform]);

  const showOriginalLayer =
    !!originalSrc && !!previewSrc && originalSrc !== previewSrc;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex max-h-[55vh] w-full max-w-full touch-none items-center justify-center overflow-hidden lg:max-h-[60vh]",
        className
      )}
    >
      <div
        className="relative flex max-h-[55vh] max-w-full items-center justify-center will-change-transform lg:max-h-[60vh]"
        style={{
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        {previewSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewSrc}
            alt={alt}
            draggable={false}
            className={cn(
              "block max-h-[55vh] max-w-full object-contain lg:max-h-[60vh]",
              originalReady &&
                showOriginalLayer &&
                "invisible"
            )}
          />
        ) : null}
        {originalReady && originalSrc ? (
          showOriginalLayer ? (
            <div className="absolute inset-0 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={originalSrc}
                alt={alt}
                draggable={false}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={originalSrc}
              alt={alt}
              draggable={false}
              className="block max-h-[55vh] max-w-full object-contain lg:max-h-[60vh]"
            />
          )
        ) : null}
      </div>
    </div>
  );
}

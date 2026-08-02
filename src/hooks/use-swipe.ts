"use client";

import { useEffect, useRef } from "react";

interface Handlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /** Only start a right-swipe when it begins within this many px of the left edge. */
  edgeOnly?: boolean;
}

const THRESHOLD = 60; // px of horizontal travel to count as a swipe
const EDGE = 28; // px from the left edge for edge-swipe
const V_TOLERANCE = 0.7; // horizontal must dominate vertical

/**
 * Attach horizontal swipe detection to the document (touch only). Ignores
 * gestures that start on scrollable code blocks / the file tree drawer.
 */
export function useSwipe({ onSwipeLeft, onSwipeRight, edgeOnly }: Handlers): void {
  const start = useRef<{ x: number; y: number; valid: boolean } | null>(null);

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      const target = e.target as HTMLElement;
      // Don't hijack swipes inside horizontally-scrollable content or the drawer.
      if (target.closest("pre, .pdf-embed, [data-no-swipe], table")) {
        start.current = null;
        return;
      }
      const valid = !edgeOnly || t.clientX <= EDGE;
      start.current = { x: t.clientX, y: t.clientY, valid };
    };

    const onEnd = (e: TouchEvent) => {
      const s = start.current;
      start.current = null;
      if (!s || !s.valid) return;
      // Selecting text (dragging selection handles) must never navigate.
      if (!window.getSelection()?.isCollapsed) return;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      if (Math.abs(dx) < THRESHOLD) return;
      if (Math.abs(dy) > Math.abs(dx) * V_TOLERANCE) return; // too vertical
      if (dx < 0) onSwipeLeft?.();
      else onSwipeRight?.();
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
    };
  }, [onSwipeLeft, onSwipeRight, edgeOnly]);
}

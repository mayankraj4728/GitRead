"use client";

import { useEffect, useState, type RefObject } from "react";

interface Options {
  count: number;
  rowHeight: number;
  /** Extra rows rendered above/below the viewport. */
  overscan?: number;
}

interface Window {
  start: number;
  end: number; // exclusive
  paddingTop: number;
  totalHeight: number;
}

/**
 * Minimal fixed-height list virtualization. Windows `count` rows against the
 * scroll position of `scrollRef` (the nearest scrollable ancestor).
 */
export function useVirtualWindow(
  scrollRef: RefObject<HTMLElement | null>,
  { count, rowHeight, overscan = 8 }: Options,
): Window {
  const [range, setRange] = useState<{ start: number; end: number }>({
    start: 0,
    end: Math.min(count, 40),
  });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const compute = () => {
      const viewport = el.clientHeight || 600;
      const scrollTop = el.scrollTop;
      const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
      const visible = Math.ceil(viewport / rowHeight) + overscan * 2;
      const end = Math.min(count, start + visible);
      setRange((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
    };

    compute();
    el.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      el.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
  }, [scrollRef, count, rowHeight, overscan]);

  const start = Math.min(range.start, Math.max(0, count - 1));
  const end = Math.min(range.end, count);
  return {
    start,
    end,
    paddingTop: start * rowHeight,
    totalHeight: count * rowHeight,
  };
}

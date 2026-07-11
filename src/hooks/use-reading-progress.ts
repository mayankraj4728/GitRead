"use client";

import { useEffect, useRef, useState } from "react";
import { postProgress } from "@/lib/progress-client";

interface Options {
  repoFullName: string;
  filePath: string;
  title: string;
  /** Restore to this fraction (0–1) on mount, if provided. */
  restoreTo?: number | null;
  activeHeadingId?: string | null;
}

/**
 * Tracks page scroll as a 0–1 fraction (rAF-throttled), restores a saved
 * position on mount, and persists progress via a lightweight API call.
 */
export function useReadingProgress({
  repoFullName,
  filePath,
  title,
  restoreTo,
  activeHeadingId,
}: Options): number {
  const [progress, setProgress] = useState(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headingRef = useRef<string | null>(activeHeadingId ?? null);
  const progressRef = useRef(0);
  headingRef.current = activeHeadingId ?? null;

  // Track scroll, throttled to one update per animation frame.
  useEffect(() => {
    let ticking = false;
    const compute = () => {
      ticking = false;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const pct = max > 0 ? Math.max(0, Math.min(1, doc.scrollTop / max)) : 0;
      progressRef.current = pct;
      setProgress(pct);
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(compute);
    };
    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // On every document switch, start at the very top; restore only if there is
  // meaningful saved progress, after layout settles.
  useEffect(() => {
    window.scrollTo(0, 0);
    if (!restoreTo || restoreTo <= 0.02) return;
    const id = setTimeout(() => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      window.scrollTo({ top: max * restoreTo, behavior: "smooth" });
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath]);

  // Persist progress a moment after scrolling settles (debounced).
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      postProgress({
        type: "progress",
        repoFullName,
        filePath,
        title,
        scrollPct: progress,
        headingId: headingRef.current,
      });
    }, 1000);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [progress, repoFullName, filePath, title]);

  // Also persist when the tab is hidden or the page is unloading.
  useEffect(() => {
    const flush = () => {
      postProgress({
        type: "progress",
        repoFullName,
        filePath,
        title,
        scrollPct: progressRef.current,
        headingId: headingRef.current,
      });
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, [repoFullName, filePath, title]);

  return progress;
}

"use client";

import { useEffect, useRef, useState } from "react";
import { saveProgress } from "@/app/actions/progress";

interface Options {
  repoFullName: string;
  filePath: string;
  title: string;
  /** Restore to this fraction (0–1) on mount, if provided. */
  restoreTo?: number | null;
  activeHeadingId?: string | null;
}

/**
 * Tracks page scroll as a 0–1 fraction, restores a saved position on mount,
 * and persists progress (debounced) via a server action.
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
  headingRef.current = activeHeadingId ?? null;

  // Track scroll.
  useEffect(() => {
    const compute = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const pct = max > 0 ? doc.scrollTop / max : 0;
      setProgress(Math.max(0, Math.min(1, pct)));
    };
    compute();
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
  }, []);

  // On every document switch, start at the very top. Then, only if there is
  // meaningful saved progress, restore to it after layout settles.
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

  // Persist progress (debounced) as the reader scrolls.
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveProgress({
        repoFullName,
        filePath,
        title,
        scrollPct: progress,
        headingId: headingRef.current,
      });
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [progress, repoFullName, filePath, title]);

  return progress;
}

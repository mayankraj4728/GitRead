"use client";

import { useEffect } from "react";
import { useReaderPrefs, WIDTH_REM } from "@/stores/reader-prefs";

/**
 * Applies reading preferences to the document (CSS vars consumed by
 * `.prose-reader`) and toggles the `zen` body class. Client-only effects, so
 * there is no SSR/hydration mismatch.
 */
export function useApplyReaderPrefs(): void {
  const { fontScale, lineHeight, width, font, zen } = useReaderPrefs();

  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty("--reading-scale", String(fontScale));
    root.setProperty("--reading-line-height", String(lineHeight));
    root.setProperty("--measure", `${WIDTH_REM[width]}rem`);
    root.setProperty("--reading-font", font === "sans" ? "var(--font-sans)" : "var(--font-serif)");
  }, [fontScale, lineHeight, width, font]);

  useEffect(() => {
    document.body.classList.toggle("zen", zen);
    return () => document.body.classList.remove("zen");
  }, [zen]);
}

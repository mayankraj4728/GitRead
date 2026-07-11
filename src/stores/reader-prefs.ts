"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ReadingWidth = "narrow" | "normal" | "wide";
export type ReadingFont = "serif" | "sans";

interface ReaderPrefsState {
  fontScale: number; // 0.9 – 1.3
  lineHeight: number; // 1.5 – 2.1
  width: ReadingWidth;
  font: ReadingFont;
  zen: boolean;
  setFontScale: (v: number) => void;
  setLineHeight: (v: number) => void;
  setWidth: (v: ReadingWidth) => void;
  setFont: (v: ReadingFont) => void;
  toggleZen: () => void;
  setZen: (v: boolean) => void;
  reset: () => void;
}

const DEFAULTS = {
  fontScale: 1,
  lineHeight: 1.8,
  width: "normal" as ReadingWidth,
  font: "serif" as ReadingFont,
};

export const WIDTH_REM: Record<ReadingWidth, number> = {
  narrow: 40,
  normal: 46,
  wide: 58,
};

export const useReaderPrefs = create<ReaderPrefsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      zen: false,
      setFontScale: (v) => set({ fontScale: clamp(v, 0.9, 1.3) }),
      setLineHeight: (v) => set({ lineHeight: clamp(v, 1.5, 2.1) }),
      setWidth: (width) => set({ width }),
      setFont: (font) => set({ font }),
      toggleZen: () => set((s) => ({ zen: !s.zen })),
      setZen: (zen) => set({ zen }),
      reset: () => set({ ...DEFAULTS }),
    }),
    {
      name: "gitread:reader-prefs",
      // Persist only the data fields (never zen, never functions).
      partialize: (s) => ({
        fontScale: s.fontScale,
        lineHeight: s.lineHeight,
        width: s.width,
        font: s.font,
      }),
    },
  ),
);

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

"use client";

import { create } from "zustand";

/** "files" is the mobile file-tree drawer; the rest are centered overlays. */
type Overlay = "palette" | "search" | "help" | "files" | null;

interface UiState {
  overlay: Overlay;
  open: (o: Exclude<Overlay, null>) => void;
  close: () => void;
  toggle: (o: Exclude<Overlay, null>) => void;
}

/** Which global overlay (command palette / search / shortcuts help) is open. */
export const useUi = create<UiState>((set) => ({
  overlay: null,
  open: (overlay) => set({ overlay }),
  close: () => set({ overlay: null }),
  toggle: (o) => set((s) => ({ overlay: s.overlay === o ? null : o })),
}));

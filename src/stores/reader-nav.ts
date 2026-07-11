"use client";

import { create } from "zustand";

export interface NavFile {
  path: string;
  name: string;
  isMarkdown: boolean;
}

interface ReaderNavState {
  repoFullName: string | null;
  files: NavFile[];
  currentPath: string | null;
  /** Populate when entering a repo (from the reader shell). */
  setRepo: (repoFullName: string, files: NavFile[]) => void;
  setCurrentPath: (path: string | null) => void;
  clear: () => void;
}

/**
 * Cross-cutting reader navigation state: the current repo's flat file list and
 * active file, shared with the command palette and prev/next controls.
 */
export const useReaderNav = create<ReaderNavState>((set) => ({
  repoFullName: null,
  files: [],
  currentPath: null,
  setRepo: (repoFullName, files) => set({ repoFullName, files }),
  setCurrentPath: (currentPath) => set({ currentPath }),
  clear: () => set({ repoFullName: null, files: [], currentPath: null }),
}));

/** Previous/next file relative to the current path, in tree order. */
export function usePrevNext(): { prev: NavFile | null; next: NavFile | null } {
  const files = useReaderNav((s) => s.files);
  const currentPath = useReaderNav((s) => s.currentPath);
  const idx = files.findIndex((f) => f.path === currentPath);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? files[idx - 1] : null,
    next: idx < files.length - 1 ? files[idx + 1] : null,
  };
}

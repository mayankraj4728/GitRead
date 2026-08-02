/** A GitHub repository, normalized for GitRead's UI. */
export interface Repo {
  id: number;
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  stars: number;
  primaryLanguage: string | null;
  pushedAt: string | null;
  defaultBranch: string;
  htmlUrl: string;
}

/** A node in the repository's Markdown file tree. */
export interface TreeNode {
  type: "dir" | "file";
  name: string;
  /** Repo-relative path, e.g. "java/oop/intro.md". */
  path: string;
  /** File extension without the dot (files only). */
  ext?: string;
  children?: TreeNode[];
}

/** A single heading in the on-this-page table of contents. */
export interface TocItem {
  id: string;
  text: string;
  depth: number; // 1..6
}

/** Rendered document payload for the reader. */
export interface DocPayload {
  repoFullName: string;
  path: string;
  title: string;
  /** Sanitized HTML produced by the markdown pipeline. */
  html: string;
  toc: TocItem[];
  readingTimeMinutes: number;
  wordCount: number;
  sha: string;
}

/** Reading progress record surfaced to the UI. */
export interface ProgressInfo {
  repoFullName: string;
  filePath: string;
  title: string | null;
  scrollPct: number;
  headingId: string | null;
  updatedAt: string;
}

/** Highlight palette keys — must match the CSS `mark[data-color=…]` rules. */
export const HIGHLIGHT_COLORS = ["yellow", "green", "blue", "pink", "orange"] as const;
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

/** A persisted text highlight, anchored by quote + surrounding context. */
export interface HighlightInfo {
  id: string;
  repoFullName: string;
  filePath: string;
  /** The highlighted text itself. */
  text: string;
  /** ~30 chars of context before/after, used to re-locate the text. */
  prefix: string;
  suffix: string;
  /** Which occurrence of (prefix+text+suffix) in the doc, 0-based. */
  occurrence: number;
  color: HighlightColor;
  /** Commit sha the highlight was created at. */
  sha: string;
  createdAt: string;
}

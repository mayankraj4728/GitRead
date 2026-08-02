/**
 * Text-highlighting DOM engine for the reader article.
 *
 * Highlights are anchored the way Hypothesis / the W3C TextQuoteSelector do
 * it: by the quoted text plus ~30 chars of surrounding context and an
 * occurrence index — NOT by DOM paths or offsets. The article HTML is rebuilt
 * on every visit (and changes whenever the repo gets a new commit), so
 * anchors must be re-locatable from the text alone.
 *
 * All functions operate on the live `.prose-reader` subtree, in the same
 * progressive-enhancement style as `enhance.ts`.
 */

import type { HighlightColor } from "@/types";

export interface HighlightAnchor {
  /** The highlighted text (exact slice of the article's textContent). */
  text: string;
  /** Up to CONTEXT chars immediately before/after, for disambiguation. */
  prefix: string;
  suffix: string;
  /** Which occurrence of (prefix+text+suffix) in the doc, 0-based. */
  occurrence: number;
}

const CONTEXT = 30;
export const MAX_HIGHLIGHT_CHARS = 2000;

/** Selectors a highlight may never touch (code chrome breaks if we split it). */
const FORBIDDEN = "pre, .mermaid-src, .code-block-header, .code-expand, .pdf-embed";

function rootText(root: HTMLElement): string {
  return root.textContent ?? "";
}

/** Global character offset of a (container, offset) boundary within root. */
function offsetInRoot(root: HTMLElement, container: Node, offset: number): number {
  const r = document.createRange();
  r.selectNodeContents(root);
  try {
    r.setEnd(container, offset);
  } catch {
    return -1;
  }
  return r.toString().length;
}

/**
 * Capture the current selection as a re-locatable anchor. Returns null when
 * the selection is collapsed, outside the article, oversized, or touches
 * regions we don't support (code blocks, diagrams).
 */
export function captureSelectionAnchor(root: HTMLElement): HighlightAnchor | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return null;

  // Reject selections that touch code blocks / diagrams / chrome.
  for (const node of [range.startContainer, range.endContainer]) {
    const el = node instanceof Element ? node : node.parentElement;
    if (el?.closest(FORBIDDEN)) return null;
  }

  const full = rootText(root);
  let start = offsetInRoot(root, range.startContainer, range.startOffset);
  let end = offsetInRoot(root, range.endContainer, range.endOffset);
  if (start < 0 || end < 0 || end <= start) return null;

  // Trim surrounding whitespace so marks hug the actual words.
  while (start < end && /\s/.test(full[start])) start++;
  while (end > start && /\s/.test(full[end - 1])) end--;
  if (end <= start) return null;
  if (end - start > MAX_HIGHLIGHT_CHARS) return null;

  const text = full.slice(start, end);
  const prefix = full.slice(Math.max(0, start - CONTEXT), start);
  const suffix = full.slice(end, end + CONTEXT);

  // Occurrence: how many earlier matches of the full pattern precede ours.
  const pattern = prefix + text + suffix;
  let occurrence = 0;
  let idx = full.indexOf(pattern);
  const ourPatternStart = start - prefix.length;
  while (idx !== -1 && idx < ourPatternStart) {
    occurrence++;
    idx = full.indexOf(pattern, idx + 1);
  }

  return { text, prefix, suffix, occurrence };
}

/** Find the nth occurrence of `needle` in `haystack`, or -1. */
function nthIndexOf(haystack: string, needle: string, n: number): number {
  let idx = -1;
  let from = 0;
  for (let i = 0; i <= n; i++) {
    idx = haystack.indexOf(needle, from);
    if (idx === -1) return -1;
    from = idx + 1;
  }
  return idx;
}

/**
 * Re-locate an anchor in the current document text. Falls back gracefully:
 * exact pattern at the stored occurrence → first pattern match → bare text at
 * the stored occurrence → first bare-text match → null (orphaned).
 */
export function resolveAnchor(
  root: HTMLElement,
  anchor: HighlightAnchor,
): { start: number; end: number } | null {
  const full = rootText(root);
  const { text, prefix, suffix, occurrence } = anchor;
  const pattern = prefix + text + suffix;

  let idx = nthIndexOf(full, pattern, occurrence);
  if (idx === -1) idx = full.indexOf(pattern);
  if (idx !== -1) {
    const start = idx + prefix.length;
    return { start, end: start + text.length };
  }

  let tIdx = nthIndexOf(full, text, occurrence);
  if (tIdx === -1) tIdx = full.indexOf(text);
  if (tIdx !== -1) return { start: tIdx, end: tIdx + text.length };

  return null;
}

/**
 * Wrap the text between global offsets [start, end) in
 * `<mark data-highlight-id data-color>` elements — one per intersected text
 * node (a selection can span bold/links/list items, which are separate
 * nodes). Returns false (and wraps nothing) if the range touches forbidden
 * regions, e.g. an anchor that drifted into a code block after a push.
 */
function wrapRange(
  root: HTMLElement,
  start: number,
  end: number,
  id: string,
  color: HighlightColor,
): boolean {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const targets: Array<{ node: Text; s: number; e: number }> = [];
  let pos = 0;

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const len = node.data.length;
    const nodeStart = pos;
    const nodeEnd = pos + len;
    pos = nodeEnd;
    if (nodeEnd <= start) continue;
    if (nodeStart >= end) break;
    targets.push({
      node,
      s: Math.max(start - nodeStart, 0),
      e: Math.min(end - nodeStart, len),
    });
  }
  if (targets.length === 0) return false;
  // All-or-nothing: never split code-block internals.
  for (const t of targets) {
    if (t.node.parentElement?.closest(FORBIDDEN)) return false;
  }

  for (const t of targets) {
    let node = t.node;
    if (t.s > 0) node = node.splitText(t.s);
    if (t.e - t.s < node.data.length) node.splitText(t.e - t.s);
    // Skip whitespace-only slivers (gaps between paragraphs/list items).
    if (!node.data.trim()) continue;
    const mark = document.createElement("mark");
    mark.className = "reader-highlight";
    mark.dataset.highlightId = id;
    mark.dataset.color = color;
    node.parentNode?.insertBefore(mark, node);
    mark.appendChild(node);
  }
  return true;
}

/** Resolve + paint one stored highlight. Returns false if it's orphaned. */
export function applyHighlight(
  root: HTMLElement,
  anchor: HighlightAnchor,
  id: string,
  color: HighlightColor,
): boolean {
  const range = resolveAnchor(root, anchor);
  if (!range) return false;
  return wrapRange(root, range.start, range.end, id, color);
}

/** Update the color of an already-painted highlight. */
export function setHighlightColor(root: HTMLElement, id: string, color: HighlightColor): void {
  root
    .querySelectorAll<HTMLElement>(`mark[data-highlight-id="${CSS.escape(id)}"]`)
    .forEach((m) => (m.dataset.color = color));
}

/** Swap a temp (optimistic) id for the server-assigned one. */
export function setHighlightId(root: HTMLElement, from: string, to: string): void {
  root
    .querySelectorAll<HTMLElement>(`mark[data-highlight-id="${CSS.escape(from)}"]`)
    .forEach((m) => (m.dataset.highlightId = to));
}

/** Unwrap all marks of a highlight, merging text nodes back together. */
export function removeHighlightMarks(root: HTMLElement, id: string): void {
  const marks = root.querySelectorAll<HTMLElement>(
    `mark[data-highlight-id="${CSS.escape(id)}"]`,
  );
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
    parent.normalize();
  });
}

"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Copy, Trash2 } from "lucide-react";
import {
  captureSelectionAnchor,
  applyHighlight,
  setHighlightColor,
  setHighlightId,
  removeHighlightMarks,
  type HighlightAnchor,
} from "./highlighter";
import { createHighlight, recolorHighlight, deleteHighlight } from "@/lib/highlights-client";
import { toast } from "@/stores/toast";
import { HIGHLIGHT_COLORS, type HighlightColor, type HighlightInfo } from "@/types";
import { cn } from "@/lib/utils";

/** Solid swatch colors — the translucent mark styles live in globals.css. */
const SWATCH: Record<HighlightColor, string> = {
  yellow: "oklch(0.86 0.17 95)",
  green: "oklch(0.8 0.16 150)",
  blue: "oklch(0.75 0.13 245)",
  pink: "oklch(0.78 0.14 350)",
  orange: "oklch(0.78 0.15 60)",
};

type Menu =
  | { mode: "new"; anchor: HighlightAnchor; x: number; y: number; above: boolean }
  | { mode: "edit"; id: string; color: HighlightColor; x: number; y: number; above: boolean };

function menuPosition(rect: DOMRect): { x: number; y: number; above: boolean } {
  const x = Math.min(Math.max(rect.left + rect.width / 2, 90), window.innerWidth - 90);
  // Prefer above the selection; flip below when it would hit the topbar.
  const above = rect.top > 130;
  const y = above ? rect.top - 10 : rect.bottom + 10;
  return { x, y, above };
}

interface Props {
  /** Ref to the `.prose-reader` article root (shared with MarkdownArticle). */
  rootRef: RefObject<HTMLDivElement | null>;
  /** Bump to re-apply highlights when the document changes. */
  docKey: string;
  repoFullName: string;
  filePath: string;
  sha: string;
  /** Highlights loaded server-side for this document. */
  initial: HighlightInfo[];
}

let tempSeq = 0;

/**
 * Selection-driven highlighting: paints stored highlights on load and shows a
 * floating color menu when text is selected (create) or a highlight is
 * clicked (recolor / copy / remove). Renders OUTSIDE the memoized article so
 * menu state changes never touch the enhanced DOM.
 */
export function HighlightLayer({ rootRef, docKey, repoFullName, filePath, sha, initial }: Props) {
  const [menu, setMenu] = useState<Menu | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Paint stored highlights once the article is in the DOM (and enhanced —
  // MarkdownArticle's effects run first in tree order, so offsets match).
  useEffect(() => {
    const root = rootRef.current;
    if (!root || initial.length === 0) return;
    let orphaned = 0;
    for (const h of initial) {
      // Guard against double-application (React strict mode re-runs effects).
      if (root.querySelector(`mark[data-highlight-id="${CSS.escape(h.id)}"]`)) continue;
      if (!applyHighlight(root, h, h.id, h.color)) orphaned++;
    }
    if (orphaned > 0) {
      toast.info(
        `${orphaned} highlight${orphaned === 1 ? "" : "s"} couldn't be restored — the document changed.`,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docKey, initial]);

  // Open the menu on selection release or on tapping an existing highlight.
  useEffect(() => {
    const onPointerUp = (e: PointerEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      // Let the browser finalize the selection (double-click, handle drags).
      setTimeout(() => {
        const root = rootRef.current;
        if (!root) return;

        const anchor = captureSelectionAnchor(root);
        if (anchor) {
          const sel = window.getSelection();
          const rect = sel?.getRangeAt(0).getBoundingClientRect();
          if (rect && rect.width + rect.height > 0) {
            setMenu({ mode: "new", anchor, ...menuPosition(rect) });
            return;
          }
        }

        const mark = (e.target as HTMLElement).closest?.(
          "mark.reader-highlight",
        ) as HTMLElement | null;
        if (mark && root.contains(mark) && mark.dataset.highlightId) {
          setMenu({
            mode: "edit",
            id: mark.dataset.highlightId,
            color: (mark.dataset.color as HighlightColor) ?? "yellow",
            ...menuPosition(mark.getBoundingClientRect()),
          });
          return;
        }

        setMenu(null);
      }, 10);
    };
    document.addEventListener("pointerup", onPointerUp);
    return () => document.removeEventListener("pointerup", onPointerUp);
  }, [rootRef]);

  // Close on scroll / resize / Escape / doc change.
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("scroll", close, { passive: true });
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", close);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);
  useEffect(() => setMenu(null), [docKey]);

  const pickColor = (color: HighlightColor) => {
    const root = rootRef.current;
    if (!root || !menu) return;

    if (menu.mode === "new") {
      const tempId = `temp-${++tempSeq}`;
      const ok = applyHighlight(root, menu.anchor, tempId, color); // optimistic
      setMenu(null);
      window.getSelection()?.removeAllRanges();
      if (!ok) {
        toast.error("This selection can't be highlighted.");
        return;
      }
      createHighlight({ repoFullName, filePath, sha, color, ...menu.anchor })
        .then((h) => setHighlightId(root, tempId, h.id))
        .catch(() => {
          removeHighlightMarks(root, tempId);
          toast.error("Couldn't save highlight");
        });
    } else {
      const prev = menu.color;
      setHighlightColor(root, menu.id, color); // optimistic
      setMenu(null);
      recolorHighlight(menu.id, color).catch(() => {
        setHighlightColor(root, menu.id, prev);
        toast.error("Couldn't update highlight");
      });
    }
  };

  const copyText = () => {
    const root = rootRef.current;
    if (!root || !menu) return;
    const text =
      menu.mode === "new"
        ? menu.anchor.text
        : Array.from(
            root.querySelectorAll(`mark[data-highlight-id="${CSS.escape(menu.id)}"]`),
            (m) => m.textContent ?? "",
          ).join("");
    navigator.clipboard.writeText(text).then(() => toast.success("Copied to clipboard"));
    setMenu(null);
    window.getSelection()?.removeAllRanges();
  };

  const remove = () => {
    const root = rootRef.current;
    if (!root || menu?.mode !== "edit") return;
    const { id } = menu;
    removeHighlightMarks(root, id); // optimistic
    setMenu(null);
    if (!id.startsWith("temp-")) {
      deleteHighlight(id).catch(() => toast.error("Couldn't remove highlight"));
    }
  };

  return (
    <AnimatePresence>
      {menu && (
        // Outer div owns positioning (motion owns `transform` on the inner).
        <div
          ref={menuRef}
          className="fixed z-[65]"
          style={{
            left: menu.x,
            top: menu.y,
            transform: `translate(-50%, ${menu.above ? "-100%" : "0"})`,
          }}
        >
          <motion.div
            role="toolbar"
            aria-label="Highlight"
            initial={{ opacity: 0, scale: 0.92, y: menu.above ? 4 : -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="flex items-center gap-1 rounded-full border border-border bg-popover px-2 py-1.5 shadow-xl"
          >
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => pickColor(c)}
                aria-label={`Highlight ${c}`}
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full transition-transform hover:scale-110",
                  menu.mode === "edit" && menu.color === c && "ring-2 ring-ring ring-offset-1 ring-offset-popover",
                )}
              >
                <span
                  className="rounded-full"
                  style={{ backgroundColor: SWATCH[c], width: "1.125rem", height: "1.125rem" }}
                />
              </button>
            ))}
            <span className="mx-0.5 h-5 w-px bg-border" />
            <button
              onClick={copyText}
              aria-label="Copy text"
              className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Copy className="size-3.5" />
            </button>
            {menu.mode === "edit" && (
              <button
                onClick={remove}
                aria-label="Remove highlight"
                className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-danger"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

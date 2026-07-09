"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { enhanceCodeBlocks, enhanceImages, renderMermaid } from "./enhance";

interface Props {
  html: string;
  /** Bump to force re-enhancement when the document changes. */
  docKey: string;
}

/** Renders sanitized markdown HTML and progressively enhances it. */
export function MarkdownArticle({ html, docKey }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const [zoom, setZoom] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    enhanceCodeBlocks(root);
    enhanceImages(root, (src, alt) => setZoom({ src, alt }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docKey]);

  // (Re)render Mermaid on load and whenever the theme flips.
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    void renderMermaid(root, resolvedTheme === "dark");
  }, [docKey, resolvedTheme]);

  // Close lightbox on Escape.
  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZoom(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);

  return (
    <>
      <div
        ref={ref}
        className="prose-reader"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <AnimatePresence>
        {zoom && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoom(null)}
          >
            <button
              className="absolute right-5 top-5 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <motion.img
              src={zoom.src}
              alt={zoom.alt}
              className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-2xl"
              initial={{ scale: 0.92 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.92 }}
              onClick={(e) => e.stopPropagation()}
            />
            {zoom.alt && (
              <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-sm text-white/70">
                {zoom.alt}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

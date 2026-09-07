"use client";

import Link from "next/link";
import { useEffect, useState, type RefObject } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Volume2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ReadingControls } from "./reading-controls";
import { BookmarkButton } from "./bookmark-button";
import { usePrevNext } from "@/stores/reader-nav";
import { useReaderPrefs } from "@/stores/reader-prefs";
import { useSpeech, readDocument } from "@/stores/speech";
import { speechSupported } from "@/lib/speech";
import { fileToTitle } from "@/lib/utils";

interface Props {
  repoFullName: string;
  filePath: string;
  title: string;
  bookmarked: boolean;
  /** Article root, used to gather text for read-aloud. */
  articleRef: RefObject<HTMLDivElement | null>;
}

/** Compact action bar at the top of a document. */
export function ReaderToolbar({ repoFullName, filePath, title, bookmarked, articleRef }: Props) {
  const { prev, next } = usePrevNext();
  const zen = useReaderPrefs((s) => s.zen);
  const toggleZen = useReaderPrefs((s) => s.toggleZen);
  const speaking = useSpeech((s) => s.status !== "idle");
  const stop = useSpeech((s) => s.stop);
  const base = `/read/${repoFullName}`;

  // `speechSupported()` reads `window`, so it's false during SSR — defer the
  // button to after mount to avoid a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const canRead = mounted && speechSupported();

  return (
    <div className="mb-6 flex items-center gap-1">
      <NavBtn href={prev ? `${base}/${prev.path}` : undefined} label={prev ? fileToTitle(prev.name) : "No previous"} dir="prev" />
      <NavBtn href={next ? `${base}/${next.path}` : undefined} label={next ? fileToTitle(next.name) : "No next"} dir="next" />

      <div className="ml-auto flex items-center gap-1">
        {canRead && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={speaking ? "Stop reading" : "Read aloud"}
                onClick={() => (speaking ? stop() : articleRef.current && readDocument(articleRef.current))}
              >
                {speaking ? (
                  <Square className="size-4 text-accent" />
                ) : (
                  <Volume2 className="size-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{speaking ? "Stop reading" : "Read aloud"}</TooltipContent>
          </Tooltip>
        )}
        <BookmarkButton
          repoFullName={repoFullName}
          filePath={filePath}
          title={title}
          initial={bookmarked}
        />
        <ReadingControls />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Zen mode" onClick={toggleZen}>
              {zen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zen mode (z)</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

function NavBtn({
  href,
  label,
  dir,
}: {
  href?: string;
  label: string;
  dir: "prev" | "next";
}) {
  const Icon = dir === "prev" ? ChevronLeft : ChevronRight;
  const content = (
    <Button variant="ghost" size="icon" aria-label={label} disabled={!href}>
      <Icon className="size-4" />
    </Button>
  );
  if (!href) return content;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link href={href}>{content}</Link>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

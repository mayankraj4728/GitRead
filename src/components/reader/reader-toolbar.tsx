"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ReadingControls } from "./reading-controls";
import { BookmarkButton } from "./bookmark-button";
import { usePrevNext } from "@/stores/reader-nav";
import { useReaderPrefs } from "@/stores/reader-prefs";
import { fileToTitle } from "@/lib/utils";

interface Props {
  repoFullName: string;
  filePath: string;
  title: string;
  bookmarked: boolean;
}

/** Compact action bar at the top of a document. */
export function ReaderToolbar({ repoFullName, filePath, title, bookmarked }: Props) {
  const { prev, next } = usePrevNext();
  const zen = useReaderPrefs((s) => s.zen);
  const toggleZen = useReaderPrefs((s) => s.toggleZen);
  const base = `/read/${repoFullName}`;

  return (
    <div className="mb-6 flex items-center gap-1">
      <NavBtn href={prev ? `${base}/${prev.path}` : undefined} label={prev ? fileToTitle(prev.name) : "No previous"} dir="prev" />
      <NavBtn href={next ? `${base}/${next.path}` : undefined} label={next ? fileToTitle(next.name) : "No next"} dir="next" />

      <div className="ml-auto flex items-center gap-1">
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

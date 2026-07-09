"use client";

import { useEffect, useMemo } from "react";
import { Clock, FileText } from "lucide-react";
import { MarkdownArticle } from "./markdown-article";
import { ReadingProgressBar } from "./reading-progress-bar";
import { TableOfContents } from "@/components/navigation/table-of-contents";
import { useReadingProgress } from "@/hooks/use-reading-progress";
import { useScrollSpy } from "@/hooks/use-scroll-spy";
import { recordOpen } from "@/app/actions/progress";
import type { DocPayload } from "@/types";

interface Props {
  doc: DocPayload;
  restoreTo: number | null;
}

/** Full reading experience: progress bar, article body, and sticky TOC. */
export function ReaderView({ doc, restoreTo }: Props) {
  const ids = useMemo(() => doc.toc.map((t) => t.id), [doc.toc]);
  const activeHeading = useScrollSpy(ids);
  const progress = useReadingProgress({
    repoFullName: doc.repoFullName,
    filePath: doc.path,
    title: doc.title,
    restoreTo,
    activeHeadingId: activeHeading,
  });

  // Record this document in reading history (once per doc).
  useEffect(() => {
    void recordOpen({ repoFullName: doc.repoFullName, filePath: doc.path, title: doc.title });
  }, [doc.repoFullName, doc.path, doc.title]);

  return (
    <>
      <ReadingProgressBar progress={progress} />
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-5 py-10 sm:px-8 xl:grid-cols-[minmax(0,1fr)_15rem]">
        <article className="min-w-0">
          <div className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <FileText className="size-3.5" /> {doc.path}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" /> {doc.readingTimeMinutes} min read ·{" "}
              {doc.wordCount.toLocaleString()} words
            </span>
          </div>
          <MarkdownArticle html={doc.html} docKey={`${doc.repoFullName}:${doc.path}:${doc.sha}`} />
        </article>

        <aside className="hidden xl:block">
          <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pb-8">
            <TableOfContents items={doc.toc} />
          </div>
        </aside>
      </div>
    </>
  );
}

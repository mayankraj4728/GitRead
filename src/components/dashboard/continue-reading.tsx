import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { fileToTitle } from "@/lib/utils";
import type { ProgressInfo } from "@/types";

/** Prominent "pick up where you left off" card. */
export function ContinueReading({ progress }: { progress: ProgressInfo }) {
  const pct = Math.round(progress.scrollPct * 100);
  const href = `/read/${progress.repoFullName}/${progress.filePath}`;
  return (
    <Link
      href={href}
      className="group relative flex items-center gap-5 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-accent-muted/60 to-card p-6 transition-colors hover:border-accent/50"
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
        <BookOpen className="size-6" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">Continue reading</p>
        <h3 className="mt-0.5 truncate text-lg font-semibold">
          {progress.title ?? fileToTitle(progress.filePath)}
        </h3>
        <p className="truncate text-sm text-muted-foreground">{progress.repoFullName}</p>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
            <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
        </div>
      </div>
      <ArrowRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-accent" />
    </Link>
  );
}

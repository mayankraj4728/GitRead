import Link from "next/link";
import { SearchX, Timer, AlertTriangle, FileQuestion, type LucideIcon } from "lucide-react";

export type RepoErrorKind = "not-found" | "rate-limit" | "empty" | "error";

const CONFIG: Record<
  RepoErrorKind,
  { icon: LucideIcon; title: string; body: string }
> = {
  "not-found": {
    icon: SearchX,
    title: "Repository not found",
    body: "This repository doesn't exist, or it's private and not accessible with your GitHub account.",
  },
  "rate-limit": {
    icon: Timer,
    title: "GitHub rate limit reached",
    body: "GitHub's API rate limit was exceeded. Please wait a little while and try again.",
  },
  empty: {
    icon: FileQuestion,
    title: "Nothing to read here",
    body: "This repository doesn't contain any readable files yet.",
  },
  error: {
    icon: AlertTriangle,
    title: "Couldn't open this repository",
    body: "Something went wrong while loading this repository. Please try again.",
  },
};

/** Beautiful, centered error state for the reader. */
export function RepoError({ kind, repo }: { kind: RepoErrorKind; repo?: string }) {
  const { icon: Icon, title, body } = CONFIG[kind];
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-28 text-center">
      <span className="grid size-16 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="size-8" />
      </span>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">{title}</h1>
      {repo && <p className="mt-1 font-mono text-sm text-muted-foreground">{repo}</p>}
      <p className="mt-3 max-w-sm text-pretty text-muted-foreground">{body}</p>
      <div className="mt-8 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          Home
        </Link>
        <Link
          href="/repos"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
        >
          Your library
        </Link>
      </div>
    </div>
  );
}

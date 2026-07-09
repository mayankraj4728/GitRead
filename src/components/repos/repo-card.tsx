import Link from "next/link";
import { Lock, Star, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { languageColor } from "@/lib/languages";
import { formatCompact, timeAgo } from "@/lib/utils";
import type { Repo } from "@/types";

/** Elegant repository card linking into the reader. */
export function RepoCard({ repo }: { repo: Repo }) {
  return (
    <Link
      href={`/read/${repo.owner}/${repo.name}`}
      className="group flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{repo.owner}</p>
          <h3 className="truncate font-semibold tracking-tight group-hover:text-accent">
            {repo.name}
          </h3>
        </div>
        <Badge variant={repo.private ? "outline" : "success"}>
          {repo.private ? (
            <>
              <Lock className="size-3" /> Private
            </>
          ) : (
            "Public"
          )}
        </Badge>
      </div>

      <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
        {repo.description ?? "No description provided."}
      </p>

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-4 text-xs text-muted-foreground">
        {repo.primaryLanguage && (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: languageColor(repo.primaryLanguage) }}
            />
            {repo.primaryLanguage}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <Star className="size-3.5" /> {formatCompact(repo.stars)}
        </span>
        {repo.pushedAt && (
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" /> {timeAgo(repo.pushedAt)}
          </span>
        )}
      </div>
    </Link>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { RepoCard } from "./repo-card";
import type { Repo } from "@/types";

type Filter = "all" | "public" | "private";

/** Searchable, filterable grid of repository cards. */
export function RepoGrid({ repos }: { repos: Repo[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return repos.filter((r) => {
      if (filter === "public" && r.private) return false;
      if (filter === "private" && !r.private) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.fullName.toLowerCase().includes(q) ||
        (r.description?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [repos, query, filter]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search repositories…"
            className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-8 text-sm outline-none ring-ring transition-shadow placeholder:text-muted-foreground focus-visible:ring-2"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <div className="inline-flex rounded-lg border border-border bg-card p-0.5 text-sm">
          {(["all", "public", "private"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={
                "rounded-md px-3 py-1 capitalize transition-colors " +
                (filter === f ? "bg-muted font-medium text-foreground" : "text-muted-foreground")
              }
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-16 text-center text-sm text-muted-foreground">
          No repositories match “{query}”.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((repo) => (
            <RepoCard key={repo.id} repo={repo} />
          ))}
        </div>
      )}
    </div>
  );
}

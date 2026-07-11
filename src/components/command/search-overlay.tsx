"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, FileText, Hash, Type, FileCode } from "lucide-react";
import { CommandOverlay } from "./command-overlay";
import { useUi } from "@/stores/ui";
import { useReaderNav } from "@/stores/reader-nav";
import { cn } from "@/lib/utils";

interface SearchResult {
  path: string;
  title: string;
  type: "filename" | "title" | "heading" | "content";
  snippet: string;
  headingId?: string;
}

const TYPE_META = {
  filename: { icon: FileCode, label: "File" },
  title: { icon: Type, label: "Title" },
  heading: { icon: Hash, label: "Heading" },
  content: { icon: FileText, label: "Text" },
} as const;

export function SearchOverlay() {
  const overlay = useUi((s) => s.overlay);
  const open = overlay === "search";
  const close = useUi((s) => s.close);
  const router = useRouter();
  const repoFullName = useReaderNav((s) => s.repoFullName);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  // Debounced search against the current repo.
  useEffect(() => {
    if (!open || !repoFullName || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const id = setTimeout(() => {
      fetch(`/api/search?repo=${encodeURIComponent(repoFullName)}&q=${encodeURIComponent(query)}`, {
        signal: ctrl.signal,
      })
        .then((r) => (r.ok ? r.json() : { results: [], truncated: false }))
        .then((d: { results: SearchResult[]; truncated: boolean }) => {
          setResults(d.results);
          setTruncated(d.truncated);
          setActive(0);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 220);
    return () => {
      clearTimeout(id);
      ctrl.abort();
    };
  }, [query, open, repoFullName]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const go = (r: SearchResult) => {
    close();
    const hash = r.headingId ? `#${r.headingId}` : "";
    router.push(`/read/${repoFullName}/${r.path}${hash}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[active]) go(results[active]);
    }
  };

  if (!open) return null;

  return (
    <CommandOverlay when="search" labelledBy="search-title">
      <div className="flex items-center gap-3 border-b border-border px-4">
        {loading ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <Search className="size-4 shrink-0 text-muted-foreground" />
        )}
        <input
          ref={inputRef}
          id="search-title"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search this repository…"
          className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          aria-label="Search repository"
        />
      </div>

      <ul ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
        {query.trim().length >= 2 && !loading && results.length === 0 && (
          <li className="px-3 py-8 text-center text-sm text-muted-foreground">
            No matches for “{query}”.
          </li>
        )}
        {results.map((r, i) => {
          const meta = TYPE_META[r.type];
          return (
            <li
              key={`${r.type}:${r.path}:${i}`}
              data-idx={i}
              onMouseMove={() => setActive(i)}
              onClick={() => go(r)}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2",
                i === active ? "bg-accent-muted" : "",
              )}
            >
              <meta.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{r.title}</span>
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {meta.label}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {r.type === "content" ? <HighlightQuery text={r.snippet} q={query} /> : r.path}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
        <span>Titles · headings · filenames · content</span>
        {truncated && <span>Large repo — indexed first 250 files</span>}
      </div>
    </CommandOverlay>
  );
}

/** Bold every case-insensitive occurrence of `q` within `text`. */
function HighlightQuery({ text, q }: { text: string; q: string }) {
  const parts = useMemo(() => {
    const query = q.trim();
    if (!query) return [text];
    const out: Array<string | { m: string }> = [];
    const lower = text.toLowerCase();
    const lq = query.toLowerCase();
    let i = 0;
    let idx = lower.indexOf(lq, i);
    while (idx >= 0) {
      if (idx > i) out.push(text.slice(i, idx));
      out.push({ m: text.slice(idx, idx + query.length) });
      i = idx + query.length;
      idx = lower.indexOf(lq, i);
    }
    if (i < text.length) out.push(text.slice(i));
    return out;
  }, [text, q]);

  return (
    <>
      {parts.map((p, i) =>
        typeof p === "string" ? (
          <span key={i}>{p}</span>
        ) : (
          <span key={i} className="font-semibold text-accent">
            {p.m}
          </span>
        ),
      )}
    </>
  );
}

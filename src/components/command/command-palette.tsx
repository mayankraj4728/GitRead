"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Home,
  Library,
  Search,
  Maximize2,
  Sun,
  Moon,
  Monitor,
  FileText,
  FolderGit2,
  CornerDownLeft,
  type LucideIcon,
} from "lucide-react";
import { CommandOverlay } from "./command-overlay";
import { Highlight } from "./highlight";
import { useUi } from "@/stores/ui";
import { useReaderNav } from "@/stores/reader-nav";
import { useReaderPrefs } from "@/stores/reader-prefs";
import { fuzzyRank } from "@/lib/fuzzy";
import { fileToTitle, cn } from "@/lib/utils";

interface Item {
  id: string;
  group: string;
  label: string;
  sublabel?: string;
  keywords?: string;
  icon: LucideIcon;
  action: () => void;
}

interface RepoLite {
  owner: string;
  name: string;
  fullName: string;
}

export function CommandPalette() {
  const overlay = useUi((s) => s.overlay);
  const open = overlay === "palette";
  const close = useUi((s) => s.close);
  const openOverlay = useUi((s) => s.open);
  const router = useRouter();
  const { setTheme } = useTheme();
  const toggleZen = useReaderPrefs((s) => s.toggleZen);
  const files = useReaderNav((s) => s.files);
  const repoFullName = useReaderNav((s) => s.repoFullName);

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [repos, setRepos] = useState<RepoLite[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Lazy-load repositories the first time the palette opens.
  useEffect(() => {
    if (!open || repos !== null) return;
    fetch("/api/repos")
      .then((r) => (r.ok ? r.json() : []))
      .then(setRepos)
      .catch(() => setRepos([]));
  }, [open, repos]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const go = (href: string) => () => router.push(href);
    const cmds: Item[] = [
      { id: "home", group: "Commands", label: "Go to Home", icon: Home, action: go("/dashboard") },
      { id: "library", group: "Commands", label: "Go to Library", icon: Library, action: go("/repos") },
      { id: "zen", group: "Commands", label: "Toggle Zen mode", keywords: "focus fullscreen", icon: Maximize2, action: toggleZen },
      { id: "theme-light", group: "Commands", label: "Theme: Light", icon: Sun, action: () => setTheme("light") },
      { id: "theme-dark", group: "Commands", label: "Theme: Dark", icon: Moon, action: () => setTheme("dark") },
      { id: "theme-system", group: "Commands", label: "Theme: System", icon: Monitor, action: () => setTheme("system") },
    ];
    if (repoFullName) {
      cmds.splice(2, 0, {
        id: "search",
        group: "Commands",
        label: "Search this repository…",
        keywords: "find content grep",
        icon: Search,
        action: () => openOverlay("search"),
      });
    }

    const fileItems: Item[] = repoFullName
      ? files.map((f) => ({
          id: `file:${f.path}`,
          group: "Files",
          label: f.isMarkdown ? fileToTitle(f.name) : f.name,
          sublabel: f.path,
          icon: FileText,
          action: go(`/read/${repoFullName}/${f.path}`),
        }))
      : [];

    const repoItems: Item[] = (repos ?? []).map((r) => ({
      id: `repo:${r.fullName}`,
      group: "Repositories",
      label: r.name,
      sublabel: r.owner,
      icon: FolderGit2,
      action: go(`/read/${r.owner}/${r.name}`),
    }));

    return [...cmds, ...fileItems, ...repoItems];
  }, [files, repoFullName, repos, router, setTheme, toggleZen, openOverlay]);

  const results = useMemo(
    () => fuzzyRank(items, query, (i) => `${i.label} ${i.sublabel ?? ""} ${i.keywords ?? ""}`, 40),
    [items, query],
  );

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const run = (item: Item) => {
    close();
    item.action();
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
      const r = results[active];
      if (r) run(r.item);
    }
  };

  if (!open) return null;

  return (
    <CommandOverlay when="palette" labelledBy="palette-title">
      <div className="flex items-center gap-3 border-b border-border px-4">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          id="palette-title"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search files, repos, commands…"
          className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          aria-label="Command palette"
        />
      </div>

      <ul ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
        {results.length === 0 && (
          <li className="px-3 py-8 text-center text-sm text-muted-foreground">No results.</li>
        )}
        {results.map(({ item, indices }, i) => {
          const showGroup = i === 0 || results[i - 1].item.group !== item.group;
          return (
            <div key={item.id}>
              {showGroup && (
                <p className="px-3 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {item.group}
                </p>
              )}
              <li
                data-idx={i}
                onMouseMove={() => setActive(i)}
                onClick={() => run(item)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm",
                  i === active ? "bg-accent-muted text-foreground" : "text-foreground/90",
                )}
              >
                <item.icon className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">
                  <Highlight text={item.label} indices={indices.length ? indices : undefined} />
                  {item.sublabel && (
                    <span className="ml-2 truncate text-xs text-muted-foreground">
                      {item.sublabel}
                    </span>
                  )}
                </span>
                {i === active && <CornerDownLeft className="size-3.5 shrink-0 text-muted-foreground" />}
              </li>
            </div>
          );
        })}
      </ul>

      <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-xs text-muted-foreground">
        <span>↑↓ navigate</span>
        <span>↵ select</span>
        <span>esc close</span>
      </div>
    </CommandOverlay>
  );
}

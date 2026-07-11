"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, PanelLeft, X } from "lucide-react";
import { FileTree } from "@/components/navigation/file-tree";
import { Button } from "@/components/ui/button";
import { useReaderNav, type NavFile } from "@/stores/reader-nav";
import type { Repo, TreeNode } from "@/types";

const MD_EXT = new Set(["md", "mdx", "markdown"]);

/** Flatten the tree to an ordered file list for prev/next + the palette. */
function flattenTree(nodes: TreeNode[], acc: NavFile[] = []): NavFile[] {
  for (const n of nodes) {
    if (n.type === "file") {
      acc.push({ path: n.path, name: n.name, isMarkdown: !!n.ext && MD_EXT.has(n.ext) });
    } else if (n.children) {
      flattenTree(n.children, acc);
    }
  }
  return acc;
}

interface Props {
  repo: Repo;
  /** App identifier used for links ("owner/name" or "owner/name~ref"). */
  slug: string;
  tree: TreeNode[];
  count: number;
  children: React.ReactNode;
}

function SidebarBody({ repo, slug, tree, count }: Omit<Props, "children">) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-4">
        <Link
          href="/repos"
          className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Library
        </Link>
        <h2 className="truncate font-semibold tracking-tight">{repo.name}</h2>
        <p className="truncate text-xs text-muted-foreground">
          {repo.owner} · {count} files
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-3">
        <FileTree tree={tree} repoFullName={slug} />
      </div>
    </div>
  );
}

/** Three-pane reading shell: file tree (left) + document/TOC (right). */
export function ReaderShell({ repo, slug, tree, count, children }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const setRepo = useReaderNav((s) => s.setRepo);
  const clearNav = useReaderNav((s) => s.clear);

  // Close the mobile drawer on navigation.
  useEffect(() => setOpen(false), [pathname]);

  // Publish the repo's flat file list for prev/next + the command palette;
  // clear it when leaving the repo.
  useEffect(() => {
    setRepo(slug, flattenTree(tree));
    return () => clearNav();
  }, [slug, tree, setRepo, clearNav]);

  return (
    <div className="reader-shell mx-auto flex max-w-[100rem] lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      {/* Desktop sidebar */}
      <aside className="zen-hide sticky top-14 hidden h-[calc(100vh-3.5rem)] border-r border-border lg:block">
        <SidebarBody repo={repo} slug={slug} tree={tree} count={count} />
      </aside>

      {/* Mobile trigger */}
      <div className="zen-hide sticky top-14 z-30 flex items-center gap-2 border-b border-border bg-background/80 px-4 py-2 backdrop-blur lg:hidden">
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <PanelLeft className="size-4" /> Files
        </Button>
        <span className="truncate text-sm text-muted-foreground">{repo.name}</span>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-[85%] max-w-xs bg-background shadow-xl lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <button
                onClick={() => setOpen(false)}
                className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
              <SidebarBody repo={repo} slug={slug} tree={tree} count={count} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="min-w-0">{children}</div>
    </div>
  );
}

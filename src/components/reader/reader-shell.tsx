"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, PanelLeft, X } from "lucide-react";
import { FileTree } from "@/components/navigation/file-tree";
import { Button } from "@/components/ui/button";
import type { Repo, TreeNode } from "@/types";

interface Props {
  repo: Repo;
  tree: TreeNode[];
  count: number;
  children: React.ReactNode;
}

function SidebarBody({ repo, tree, count }: Omit<Props, "children">) {
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
          {repo.owner} · {count} docs
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-3">
        <FileTree tree={tree} repoFullName={repo.fullName} />
      </div>
    </div>
  );
}

/** Three-pane reading shell: file tree (left) + document/TOC (right). */
export function ReaderShell({ repo, tree, count, children }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the mobile drawer on navigation.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="mx-auto flex max-w-[100rem] lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      {/* Desktop sidebar */}
      <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] border-r border-border lg:block">
        <SidebarBody repo={repo} tree={tree} count={count} />
      </aside>

      {/* Mobile trigger */}
      <div className="sticky top-14 z-30 flex items-center gap-2 border-b border-border bg-background/80 px-4 py-2 backdrop-blur lg:hidden">
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
              <SidebarBody repo={repo} tree={tree} count={count} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="min-w-0">{children}</div>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { FileTree } from "@/components/navigation/file-tree";
import { useReaderNav, usePrevNext, type NavFile } from "@/stores/reader-nav";
import { useUi } from "@/stores/ui";
import { useSwipe } from "@/hooks/use-swipe";
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

function SidebarBody({
  repo,
  slug,
  tree,
  count,
  onClose,
}: Omit<Props, "children"> & { onClose?: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-4">
        {onClose ? (
          // Drawer mode: the back arrow closes the drawer (Library lives in
          // the bottom nav on mobile, so no navigation link here).
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              aria-label="Close file tree"
              className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div className="min-w-0">
              <h2 className="truncate font-semibold tracking-tight">{repo.name}</h2>
              <p className="truncate text-xs text-muted-foreground">
                {repo.owner} · {count} files
              </p>
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-2 py-3">
        <FileTree tree={tree} repoFullName={slug} scrollRef={scrollRef} />
      </div>
    </div>
  );
}

/** Three-pane reading shell: file tree (left) + document/TOC (right). */
export function ReaderShell({ repo, slug, tree, count, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const overlay = useUi((s) => s.overlay);
  const openOverlay = useUi((s) => s.open);
  const closeOverlay = useUi((s) => s.close);
  const setRepo = useReaderNav((s) => s.setRepo);
  const clearNav = useReaderNav((s) => s.clear);
  const { prev, next } = usePrevNext();

  // The drawer lives in the shared ui store so the topbar's repo button
  // (mobile) can open it from outside this component.
  const open = overlay === "files";
  const setOpen = (v: boolean) => (v ? openOverlay("files") : closeOverlay());

  // Close the mobile drawer on navigation.
  useEffect(() => {
    if (useUi.getState().overlay === "files") useUi.getState().close();
  }, [pathname]);

  // Publish the repo's flat file list for prev/next + the command palette;
  // clear it when leaving the repo.
  useEffect(() => {
    setRepo(slug, flattenTree(tree));
    return () => clearNav();
  }, [slug, tree, setRepo, clearNav]);

  // Mobile gestures: edge-swipe-right opens the file tree; when it's closed,
  // swipe left/right navigates to the next/previous document.
  useSwipe({
    edgeOnly: true,
    onSwipeRight: () => setOpen(true),
  });
  useSwipe({
    onSwipeLeft: () => {
      if (!open && next) router.push(`/read/${slug}/${next.path}`);
    },
    onSwipeRight: () => {
      if (!open && prev) router.push(`/read/${slug}/${prev.path}`);
    },
  });

  return (
    // NOTE: flex-col on mobile — a bare `flex` row squeezed the article into
    // the right half of the screen next to the (now removed) trigger bar.
    <div className="reader-shell mx-auto flex max-w-[100rem] flex-col lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      {/* Desktop sidebar */}
      <aside className="zen-hide sticky top-14 hidden h-[calc(100vh-3.5rem)] border-r border-border lg:block">
        <SidebarBody repo={repo} slug={slug} tree={tree} count={count} />
      </aside>

      {/* Mobile drawer (opened from the topbar repo button or edge swipe) */}
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
              <SidebarBody
                repo={repo}
                slug={slug}
                tree={tree}
                count={count}
                onClose={() => setOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="min-w-0">{children}</div>
    </div>
  );
}

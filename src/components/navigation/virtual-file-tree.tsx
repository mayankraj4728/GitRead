"use client";

import { useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, FileText, Folder, FolderOpen } from "lucide-react";
import { useVirtualWindow } from "@/hooks/use-virtual-window";
import { cn, fileToTitle } from "@/lib/utils";
import type { TreeNode } from "@/types";

const MARKDOWN_EXT = new Set(["md", "mdx", "markdown"]);
const ROW_H = 32;
const INDENT = 12;

interface FlatRow {
  node: TreeNode;
  depth: number;
}

function displayName(node: TreeNode): string {
  if (node.type === "dir") return node.name;
  return node.ext && MARKDOWN_EXT.has(node.ext) ? fileToTitle(node.name) : node.name;
}

/** Flatten only the currently-visible rows (children of expanded folders). */
function flattenVisible(nodes: TreeNode[], isOpen: (p: string) => boolean, depth = 0, acc: FlatRow[] = []): FlatRow[] {
  for (const node of nodes) {
    acc.push({ node, depth });
    if (node.type === "dir" && node.children && isOpen(node.path)) {
      flattenVisible(node.children, isOpen, depth + 1, acc);
    }
  }
  return acc;
}

interface Props {
  tree: TreeNode[];
  base: string;
  activePath: string;
  isOpen: (path: string) => boolean;
  onToggle: (path: string) => void;
  scrollRef: React.RefObject<HTMLElement | null>;
}

/**
 * Virtualized file tree for large repositories: only visible rows are flattened
 * and only on-screen rows are rendered, so thousands of files stay smooth.
 */
export function VirtualFileTree({ tree, base, activePath, isOpen, onToggle, scrollRef }: Props) {
  const router = useRouter();
  const rows = useMemo(() => flattenVisible(tree, isOpen), [tree, isOpen]);
  const { start, end, paddingTop, totalHeight } = useVirtualWindow(scrollRef, {
    count: rows.length,
    rowHeight: ROW_H,
  });
  const slice = rows.slice(start, end);

  return (
    <nav aria-label="Files" className="text-sm" style={{ height: totalHeight, position: "relative" }}>
      <div style={{ transform: `translateY(${paddingTop}px)` }}>
        {slice.map(({ node, depth }) => {
          const pad = { paddingLeft: `${depth * INDENT + 8}px`, height: ROW_H };
          if (node.type === "file") {
            const active = node.path === activePath;
            const href = `${base}/${node.path}`;
            return (
              <Link
                key={node.path}
                href={href}
                style={pad}
                aria-current={active ? "page" : undefined}
                onMouseEnter={() => router.prefetch(href)}
                className={cn(
                  "flex items-center gap-2 rounded-md pr-2 transition-colors",
                  active
                    ? "bg-accent-muted font-medium text-accent"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <FileText className="size-4 shrink-0 opacity-70" />
                <span className="truncate">{displayName(node)}</span>
              </Link>
            );
          }
          const open = isOpen(node.path);
          return (
            <button
              key={node.path}
              onClick={() => onToggle(node.path)}
              style={pad}
              aria-expanded={open}
              className="flex w-full items-center gap-1.5 rounded-md pr-2 text-foreground/80 transition-colors hover:bg-muted"
            >
              <ChevronRight className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-90")} />
              {open ? (
                <FolderOpen className="size-4 shrink-0 text-accent/80" />
              ) : (
                <Folder className="size-4 shrink-0 opacity-70" />
              )}
              <span className="truncate font-medium">{node.name}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

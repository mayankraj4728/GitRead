"use client";

import { useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { usePersistedSet } from "@/hooks/use-persisted-set";
import { FileTreeNode } from "./file-tree-node";
import { VirtualFileTree } from "./virtual-file-tree";
import type { TreeNode } from "@/types";

// Above this many total nodes, switch to the virtualized (windowed) renderer.
const VIRTUALIZE_THRESHOLD = 300;

interface Props {
  tree: TreeNode[];
  repoFullName: string; // "owner/name"
  /** Scroll container that wraps the tree — required for virtualization. */
  scrollRef?: React.RefObject<HTMLElement | null>;
}

/** Ancestor dir paths of the active file, so its folders start expanded. */
function ancestorsOf(path: string): string[] {
  if (!path) return [];
  const parts = path.split("/");
  parts.pop();
  const acc: string[] = [];
  parts.reduce((prefix, part) => {
    const next = prefix ? `${prefix}/${part}` : part;
    acc.push(next);
    return next;
  }, "");
  return acc;
}

function countNodes(nodes: TreeNode[]): number {
  let n = 0;
  for (const node of nodes) {
    n++;
    if (node.children) n += countNodes(node.children);
  }
  return n;
}

export function FileTree({ tree, repoFullName, scrollRef }: Props) {
  const pathname = usePathname();
  const base = `/read/${repoFullName}`;
  const activePath = pathname.startsWith(base + "/")
    ? decodeURIComponent(pathname.slice(base.length + 1))
    : "";

  const initialOpen = useMemo(() => ancestorsOf(activePath), [activePath]);
  const { has, toggle } = usePersistedSet(`gitread:tree:${repoFullName}`, initialOpen);

  const total = useMemo(() => countNodes(tree), [tree]);
  const localRef = useRef<HTMLElement>(null);
  const effectiveScrollRef = scrollRef ?? localRef;

  // Large repositories: virtualized renderer, windowed against the scroll parent.
  if (total > VIRTUALIZE_THRESHOLD) {
    return (
      <VirtualFileTree
        tree={tree}
        base={base}
        activePath={activePath}
        isOpen={has}
        onToggle={toggle}
        scrollRef={effectiveScrollRef}
      />
    );
  }

  // Small/medium repositories: the animated tree (unchanged).
  return (
    <nav aria-label="Files" className="space-y-0.5 text-sm">
      {tree.map((node) => (
        <FileTreeNode
          key={node.path}
          node={node}
          depth={0}
          base={base}
          activePath={activePath}
          isOpen={has}
          onToggle={toggle}
        />
      ))}
    </nav>
  );
}

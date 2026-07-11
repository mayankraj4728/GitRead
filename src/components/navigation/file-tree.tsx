"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { usePersistedSet } from "@/hooks/use-persisted-set";
import { FileTreeNode } from "./file-tree-node";
import type { TreeNode } from "@/types";

interface Props {
  tree: TreeNode[];
  repoFullName: string; // "owner/name"
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

export function FileTree({ tree, repoFullName }: Props) {
  const pathname = usePathname();
  const base = `/read/${repoFullName}`;
  const activePath = pathname.startsWith(base + "/")
    ? decodeURIComponent(pathname.slice(base.length + 1))
    : "";

  const initialOpen = useMemo(() => ancestorsOf(activePath), [activePath]);
  const { has, toggle } = usePersistedSet(`gitread:tree:${repoFullName}`, initialOpen);

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

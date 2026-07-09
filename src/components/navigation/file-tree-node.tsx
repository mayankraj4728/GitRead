"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, FileText, Folder, FolderOpen } from "lucide-react";
import { cn, fileToTitle } from "@/lib/utils";
import type { TreeNode } from "@/types";

interface Props {
  node: TreeNode;
  depth: number;
  base: string;
  activePath: string;
  isOpen: (path: string) => boolean;
  onToggle: (path: string) => void;
}

const INDENT = 12;

export function FileTreeNode({ node, depth, base, activePath, isOpen, onToggle }: Props) {
  const pad = { paddingLeft: `${depth * INDENT + 8}px` };

  if (node.type === "file") {
    const active = node.path === activePath;
    return (
      <Link
        href={`${base}/${node.path}`}
        style={pad}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-2 rounded-md py-1.5 pr-2 transition-colors",
          active
            ? "bg-accent-muted font-medium text-accent"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <FileText className="size-4 shrink-0 opacity-70" />
        <span className="truncate">{fileToTitle(node.name)}</span>
      </Link>
    );
  }

  const open = isOpen(node.path);
  return (
    <div>
      <button
        onClick={() => onToggle(node.path)}
        style={pad}
        className="flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 text-foreground/80 transition-colors hover:bg-muted"
        aria-expanded={open}
      >
        <ChevronRight
          className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-90")}
        />
        {open ? (
          <FolderOpen className="size-4 shrink-0 text-accent/80" />
        ) : (
          <Folder className="size-4 shrink-0 opacity-70" />
        )}
        <span className="truncate font-medium">{node.name}</span>
      </button>

      <AnimatePresence initial={false}>
        {open && node.children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {node.children.map((child) => (
              <FileTreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                base={base}
                activePath={activePath}
                isOpen={isOpen}
                onToggle={onToggle}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

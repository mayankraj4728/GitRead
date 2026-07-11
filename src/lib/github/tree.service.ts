import type { Octokit } from "@octokit/rest";
import { cached, cacheKeys, TTL } from "@/lib/cache";
import { withRetry } from "./client";
import type { TreeNode } from "@/types";

const MARKDOWN_RE = /\.(md|mdx|markdown)$/i;

/** Build a nested tree (dirs first, alphabetical) from flat file paths. */
export function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode = { type: "dir", name: "", path: "", children: [] };

  for (const path of paths) {
    const parts = path.split("/");
    let cursor = root;
    parts.forEach((part, i) => {
      const isFile = i === parts.length - 1;
      const currentPath = parts.slice(0, i + 1).join("/");
      cursor.children ??= [];
      let next = cursor.children.find((c) => c.name === part);
      if (!next) {
        next = isFile
          ? {
              type: "file",
              name: part,
              path: currentPath,
              ext: part.split(".").pop()?.toLowerCase(),
            }
          : { type: "dir", name: part, path: currentPath, children: [] };
        cursor.children.push(next);
      }
      cursor = next;
    });
  }

  return sortNodes(root.children ?? []);
}

function sortNodes(nodes: TreeNode[]): TreeNode[] {
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { numeric: true });
  });
  for (const n of nodes) if (n.children) n.children = sortNodes(n.children);
  return nodes;
}

// Noise we never want to surface in the reader's file tree.
const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  ".turbo",
  ".cache",
  "vendor",
]);

function isIgnored(path: string): boolean {
  return path.split("/").some((seg) => IGNORED_DIRS.has(seg));
}

/** Fetch the full file tree for a repo at a given commit sha (cached by sha). */
export async function getFileTree(
  owner: string,
  name: string,
  sha: string,
  octokit: Octokit,
): Promise<{ tree: TreeNode[]; count: number; markdownCount: number }> {
  const fullName = `${owner}/${name}`;
  return cached(cacheKeys.tree(fullName, sha), TTL.content, async () => {
    const { data } = await withRetry(() =>
      octokit.git.getTree({ owner, repo: name, tree_sha: sha, recursive: "1" }),
    );
    const paths = (data.tree ?? [])
      .filter((n) => n.type === "blob" && n.path && !isIgnored(n.path))
      .map((n) => n.path as string);
    const markdownCount = paths.filter((p) => MARKDOWN_RE.test(p)).length;
    return { tree: buildTree(paths), count: paths.length, markdownCount };
  });
}

/**
 * Find the best doc to open by default: a README, else the first Markdown file,
 * else the first file. When `folder` is given, prefer entries inside it.
 */
export function findEntryDoc(tree: TreeNode[], folder?: string): string | null {
  const files: TreeNode[] = [];
  const walk = (nodes: TreeNode[]) => {
    for (const n of nodes) {
      if (n.type === "file") files.push(n);
      else if (n.children) walk(n.children);
    }
  };
  walk(tree);
  if (files.length === 0) return null;

  const prefix = folder ? folder.replace(/\/+$/, "") + "/" : null;
  const scoped = prefix ? files.filter((f) => f.path.startsWith(prefix)) : files;
  const pool = scoped.length > 0 ? scoped : files;

  const readme = pool.find((f) => /(^|\/)readme\.(md|mdx|markdown)$/i.test(f.path));
  const firstMd = pool.find((f) => MARKDOWN_RE.test(f.name));
  return (readme ?? firstMd ?? pool[0]).path;
}

import type { Octokit } from "@octokit/rest";
import { cached, cacheKeys, TTL } from "@/lib/cache";
import type { TreeNode } from "@/types";

const MARKDOWN_RE = /\.(md|mdx|markdown)$/i;

/** Build a nested tree (dirs first, alphabetical) from flat markdown paths. */
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

/** Fetch the markdown file tree for a repo at a given commit sha (cached by sha). */
export async function getMarkdownTree(
  owner: string,
  name: string,
  sha: string,
  octokit: Octokit,
): Promise<{ tree: TreeNode[]; count: number }> {
  const fullName = `${owner}/${name}`;
  return cached(cacheKeys.tree(fullName, sha), TTL.content, async () => {
    const { data } = await octokit.git.getTree({
      owner,
      repo: name,
      tree_sha: sha,
      recursive: "1",
    });
    const paths = (data.tree ?? [])
      .filter((n) => n.type === "blob" && n.path && MARKDOWN_RE.test(n.path))
      .map((n) => n.path as string);
    return { tree: buildTree(paths), count: paths.length };
  });
}

/** Find the first readable doc (prefers a README) to open by default. */
export function findEntryDoc(tree: TreeNode[]): string | null {
  const files: TreeNode[] = [];
  const walk = (nodes: TreeNode[]) => {
    for (const n of nodes) {
      if (n.type === "file") files.push(n);
      else if (n.children) walk(n.children);
    }
  };
  walk(tree);
  if (files.length === 0) return null;
  const readme = files.find((f) => /^readme\.(md|mdx|markdown)$/i.test(f.name));
  return (readme ?? files[0]).path;
}

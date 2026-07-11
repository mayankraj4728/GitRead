import "server-only";
import GithubSlugger from "github-slugger";
import type { Octokit } from "@octokit/rest";
import { requireOctokit } from "@/lib/github/client";
import { getRepo, getHeadSha } from "@/lib/github/repos.service";
import { getFileTree } from "@/lib/github/tree.service";
import { getFileContent } from "@/lib/github/content.service";
import { cached, cacheKeys, TTL } from "@/lib/cache";
import { fileToTitle } from "@/lib/utils";
import type { TreeNode } from "@/types";

const MARKDOWN_RE = /\.(md|mdx|markdown)$/i;
const MAX_INDEX_FILES = 250; // bound the per-repo indexing cost
const MAX_CONTENT = 4000; // chars stored per file for content matching

export interface SearchResult {
  path: string;
  title: string;
  type: "filename" | "title" | "heading" | "content";
  snippet: string;
  headingId?: string;
}

interface Heading {
  text: string;
  id: string;
}
interface IndexEntry {
  path: string;
  title: string;
  headings: Heading[];
  content: string;
}
interface RepoIndex {
  files: Array<{ path: string; name: string; markdown: boolean }>;
  entries: IndexEntry[];
  truncated: boolean;
}

function flatten(nodes: TreeNode[], acc: RepoIndex["files"] = []): RepoIndex["files"] {
  for (const n of nodes) {
    if (n.type === "file") {
      acc.push({ path: n.path, name: n.name, markdown: MARKDOWN_RE.test(n.name) });
    } else if (n.children) flatten(n.children, acc);
  }
  return acc;
}

function parseHeadings(md: string): Heading[] {
  const slugger = new GithubSlugger();
  const out: Heading[] = [];
  for (const line of md.split("\n")) {
    const m = /^#{1,6}\s+(.+?)\s*#*$/.exec(line);
    if (m) {
      const text = m[1].replace(/[*_`]/g, "").trim();
      if (text) out.push({ text, id: slugger.slug(text) });
    }
  }
  return out;
}

function firstTitle(md: string, path: string): string {
  const m = /^\s*#\s+(.+?)\s*$/m.exec(md);
  return m ? m[1].replace(/[*_`]/g, "").trim() : fileToTitle(path);
}

/** Build (and cache) a searchable index of a repo's markdown at a commit sha. */
async function buildIndex(
  owner: string,
  name: string,
  sha: string,
  octokit: Octokit,
): Promise<RepoIndex> {
  const fullName = `${owner}/${name}`;
  return cached(cacheKeys.searchIndex(fullName, sha), TTL.content, async () => {
    const { tree } = await getFileTree(owner, name, sha, octokit);
    const files = flatten(tree);
    const mdFiles = files.filter((f) => f.markdown).slice(0, MAX_INDEX_FILES);
    const truncated = files.filter((f) => f.markdown).length > MAX_INDEX_FILES;

    const entries = await Promise.all(
      mdFiles.map(async (f): Promise<IndexEntry | null> => {
        try {
          const raw = await getFileContent(owner, name, sha, f.path, octokit);
          return {
            path: f.path,
            title: firstTitle(raw, f.path),
            headings: parseHeadings(raw),
            content: raw.slice(0, MAX_CONTENT),
          };
        } catch {
          return null;
        }
      }),
    );

    return { files, entries: entries.filter((e): e is IndexEntry => e !== null), truncated };
  });
}

function snippet(content: string, at: number, qlen: number): string {
  const start = Math.max(0, at - 40);
  const end = Math.min(content.length, at + qlen + 60);
  const text = content.slice(start, end).replace(/\s+/g, " ").trim();
  return (start > 0 ? "… " : "") + text + (end < content.length ? " …" : "");
}

/** Search a repository's files + markdown headings/content for `q`. */
export async function searchRepo(
  owner: string,
  name: string,
  q: string,
  ref?: string,
): Promise<{ results: SearchResult[]; truncated: boolean }> {
  const query = q.trim().toLowerCase();
  if (query.length < 2) return { results: [], truncated: false };

  const { octokit } = await requireOctokit();
  const repo = await getRepo(owner, name, octokit);
  const sha = await getHeadSha(owner, name, ref ?? repo.defaultBranch, octokit);
  const index = await buildIndex(owner, name, sha, octokit);

  const scored: Array<{ r: SearchResult; score: number }> = [];
  const seen = new Set<string>();
  const push = (r: SearchResult, score: number) => {
    const key = `${r.type}:${r.path}:${r.snippet}`;
    if (seen.has(key)) return;
    seen.add(key);
    scored.push({ r, score });
  };

  // Filenames (all files).
  for (const f of index.files) {
    if (f.name.toLowerCase().includes(query)) push({ path: f.path, title: fileToTitle(f.name), type: "filename", snippet: f.path }, 100);
    else if (f.path.toLowerCase().includes(query)) push({ path: f.path, title: fileToTitle(f.name), type: "filename", snippet: f.path }, 55);
  }

  // Titles, headings, content (markdown).
  for (const e of index.entries) {
    if (e.title.toLowerCase().includes(query)) push({ path: e.path, title: e.title, type: "title", snippet: e.title }, 90);
    for (const h of e.headings) {
      if (h.text.toLowerCase().includes(query)) push({ path: e.path, title: e.title, type: "heading", snippet: h.text, headingId: h.id }, 70);
    }
    const at = e.content.toLowerCase().indexOf(query);
    if (at >= 0) push({ path: e.path, title: e.title, type: "content", snippet: snippet(e.content, at, query.length) }, 40);
  }

  scored.sort((a, b) => b.score - a.score);
  return { results: scored.slice(0, 40).map((s) => s.r), truncated: index.truncated };
}

import "server-only";
import { cache } from "react";
import { cached, cacheKeys, TTL } from "@/lib/cache";
import { requireOctokit, classifyGitHubError } from "@/lib/github/client";
import { getRepo, getHeadSha, listRepos, listStarredRepos } from "@/lib/github/repos.service";
import { getFileTree, findEntryDoc } from "@/lib/github/tree.service";
import { getFileContent, FileNotFoundError } from "@/lib/github/content.service";
import { renderMarkdown } from "@/lib/markdown/process";
import {
  classify,
  renderCodeFile,
  renderImageDoc,
  renderPdfDoc,
  renderBinaryDoc,
} from "@/lib/document";
import { repoSlug } from "@/lib/github-url";
import type { DocPayload, Repo, TreeNode } from "@/types";

export interface RepoBundle {
  repo: Repo;
  tree: TreeNode[];
  fileCount: number;
  markdownCount: number;
  sha: string;
  /** App-level identifier used for links + DB ("owner/name" or "owner/name~ref"). */
  slug: string;
  entryPath: string | null;
}

/** List the signed-in user's repositories (cached). */
export async function getMyRepos(): Promise<Repo[]> {
  const { userId, octokit } = await requireOctokit();
  return listRepos(userId, octokit);
}

/** List the repos the user has starred on GitHub (cached). */
export async function getMyStarredRepos(): Promise<Repo[]> {
  const { userId, octokit } = await requireOctokit();
  return listStarredRepos(userId, octokit);
}

/**
 * Load a repo's metadata + full file tree. Works for ANY repo the token can
 * reach (the user's own + every public repo) — the data source is identical.
 * `ref` selects a branch/tag; when omitted the default branch is used.
 * Wrapped in React `cache` so the layout + index page share one call per request.
 */
export const getRepoBundle = cache(
  async (owner: string, name: string, ref?: string): Promise<RepoBundle> => {
    const { octokit } = await requireOctokit();
    let repo: Repo;
    try {
      repo = await getRepo(owner, name, octokit);
    } catch (err) {
      throw classifyGitHubError(err, `${owner}/${name}`);
    }
    const sha = await getHeadSha(owner, name, ref ?? repo.defaultBranch, octokit);
    const { tree, count, markdownCount } = await getFileTree(owner, name, sha, octokit);
    return {
      repo,
      tree,
      fileCount: count,
      markdownCount,
      sha,
      slug: repoSlug(owner, name, ref, repo.defaultBranch),
      entryPath: findEntryDoc(tree),
    };
  },
);

/**
 * Load + render a single document. Markdown → prose; source/text → highlighted
 * code; images → preview; binaries → placeholder. Everything after the fetch is
 * identical regardless of whose repo it is. Wrapped in React `cache` so
 * `generateMetadata` and the page share one fetch per request.
 */
export const getDocument = cache(
  async (owner: string, name: string, path: string, ref?: string): Promise<DocPayload> => {
    const { octokit } = await requireOctokit();
    let repo: Repo;
    try {
      repo = await getRepo(owner, name, octokit);
    } catch (err) {
      throw classifyGitHubError(err, `${owner}/${name}`);
    }
    const sha = await getHeadSha(owner, name, ref ?? repo.defaultBranch, octokit);
    const slug = repoSlug(owner, name, ref, repo.defaultBranch);
    // Asset/raw-image URLs use owner/name; app identifier uses the slug.
    const assetCtx = { repoFullName: repo.fullName, sha };
    const kind = classify(path);

    const withSlug = (doc: DocPayload): DocPayload => ({ ...doc, repoFullName: slug });

    if (kind === "image") return withSlug(renderImageDoc(path, assetCtx));
    if (kind === "pdf") return withSlug(renderPdfDoc(path, assetCtx));
    if (kind === "binary") return withSlug(renderBinaryDoc(path, assetCtx));

    // Cache the fully-rendered document (Shiki highlighting is the slow step and
    // was previously re-run on every load). Pinned to the sha, so a push emits a
    // fresh key. Stored with the asset-level repoFullName; the app slug is
    // stamped on afterwards so branch (~ref) links stay correct.
    const rendered = await cached(
      cacheKeys.doc(repo.fullName, sha, path),
      TTL.content,
      async () => {
        let raw: string;
        try {
          raw = await getFileContent(owner, name, sha, path, octokit);
        } catch (err) {
          if (err instanceof FileNotFoundError) return renderBinaryDoc(path, assetCtx);
          throw err;
        }
        if (kind === "markdown") {
          return renderMarkdown(raw, { repoFullName: repo.fullName, path, sha });
        }
        return renderCodeFile(raw, path, assetCtx);
      },
    );
    return withSlug(rendered);
  },
);

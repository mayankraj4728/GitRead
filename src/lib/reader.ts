import "server-only";
import { requireOctokit } from "@/lib/github/client";
import { getRepo, getHeadSha, listRepos } from "@/lib/github/repos.service";
import { getMarkdownTree, findEntryDoc } from "@/lib/github/tree.service";
import { getFileContent } from "@/lib/github/content.service";
import { renderMarkdown } from "@/lib/markdown/process";
import type { DocPayload, Repo, TreeNode } from "@/types";

export interface RepoBundle {
  repo: Repo;
  tree: TreeNode[];
  markdownCount: number;
  sha: string;
  entryPath: string | null;
}

/** List the signed-in user's repositories (cached). */
export async function getMyRepos(): Promise<Repo[]> {
  const { userId, octokit } = await requireOctokit();
  return listRepos(userId, octokit);
}

/** Load a repo's metadata + markdown tree at its current HEAD (all cached). */
export async function getRepoBundle(owner: string, name: string): Promise<RepoBundle> {
  const { octokit } = await requireOctokit();
  const repo = await getRepo(owner, name, octokit);
  const sha = await getHeadSha(owner, name, repo.defaultBranch, octokit);
  const { tree, count } = await getMarkdownTree(owner, name, sha, octokit);
  return { repo, tree, markdownCount: count, sha, entryPath: findEntryDoc(tree) };
}

/** Load + render a single document at the repo's current HEAD. */
export async function getDocument(
  owner: string,
  name: string,
  path: string,
): Promise<DocPayload> {
  const { octokit } = await requireOctokit();
  const repo = await getRepo(owner, name, octokit);
  const sha = await getHeadSha(owner, name, repo.defaultBranch, octokit);
  const raw = await getFileContent(owner, name, sha, path, octokit);
  return renderMarkdown(raw, { repoFullName: repo.fullName, path, sha });
}

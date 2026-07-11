import type { Octokit } from "@octokit/rest";
import { cached, cacheKeys, TTL } from "@/lib/cache";
import { withRetry } from "./client";
import type { Repo } from "@/types";

/** Map a raw GitHub repo payload to our normalized {@link Repo}. */
function toRepo(r: {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
  description: string | null;
  private: boolean;
  stargazers_count?: number;
  language?: string | null;
  pushed_at?: string | null;
  default_branch?: string;
  html_url: string;
}): Repo {
  return {
    id: r.id,
    owner: r.owner.login,
    name: r.name,
    fullName: r.full_name,
    description: r.description,
    private: r.private,
    stars: r.stargazers_count ?? 0,
    primaryLanguage: r.language ?? null,
    pushedAt: r.pushed_at ?? null,
    defaultBranch: r.default_branch ?? "main",
    htmlUrl: r.html_url,
  };
}

/** List the authenticated user's repositories, most recently pushed first. */
export async function listRepos(userId: string, octokit: Octokit): Promise<Repo[]> {
  return cached(cacheKeys.repoList(userId), TTL.repoList, async () => {
    const repos = await octokit.paginate(octokit.repos.listForAuthenticatedUser, {
      per_page: 100,
      sort: "pushed",
      affiliation: "owner,collaborator,organization_member",
    });
    return repos.map(toRepo);
  });
}

/** Fetch a single repository's metadata. */
export async function getRepo(
  owner: string,
  name: string,
  octokit: Octokit,
): Promise<Repo> {
  const fullName = `${owner}/${name}`;
  return cached(cacheKeys.repoMeta(fullName), TTL.repoList, async () => {
    const { data } = await withRetry(() => octokit.repos.get({ owner, repo: name }));
    return toRepo(data);
  });
}

/**
 * The current HEAD commit sha of a ref. Short TTL — this is the freshness dial
 * that makes pushed content appear without hammering the API for file bodies.
 */
export async function getHeadSha(
  owner: string,
  name: string,
  ref: string,
  octokit: Octokit,
): Promise<string> {
  const fullName = `${owner}/${name}`;
  return cached(cacheKeys.repoHead(fullName, ref), TTL.head, async () => {
    const { data } = await withRetry(() => octokit.repos.getCommit({ owner, repo: name, ref }));
    return data.sha;
  });
}

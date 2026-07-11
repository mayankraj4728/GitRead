import { Octokit } from "@octokit/rest";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Read the stored GitHub access token for a user (from the OAuth account). */
export async function getGitHubToken(userId: string): Promise<string | null> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "github" },
    select: { access_token: true },
  });
  return account?.access_token ?? null;
}

/** Build an Octokit instance authenticated as the given user. */
export async function octokitForUser(userId: string): Promise<Octokit> {
  const token = await getGitHubToken(userId);
  if (!token) throw new GitHubAuthError("No GitHub access token for user.");
  return new Octokit({ auth: token });
}

/**
 * Resolve the current session + an authenticated Octokit in one step.
 * Throws {@link UnauthenticatedError} when there is no session.
 */
export async function requireOctokit(): Promise<{ userId: string; octokit: Octokit }> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthenticatedError();
  const octokit = await octokitForUser(session.user.id);
  return { userId: session.user.id, octokit };
}

const RETRYABLE_STATUS = new Set([502, 503, 504, 429, 500]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a GitHub call on transient errors (5xx / rate-limit) with exponential
 * backoff. GitHub intermittently returns 502 "Unicorn" pages; without this a
 * single hiccup crashes the reader.
 */
export async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (attempt < retries && status !== undefined && RETRYABLE_STATUS.has(status)) {
        await sleep(300 * 2 ** attempt);
        attempt++;
        continue;
      }
      throw err;
    }
  }
}

export class UnauthenticatedError extends Error {
  constructor() {
    super("Not authenticated.");
    this.name = "UnauthenticatedError";
  }
}

export class GitHubAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitHubAuthError";
  }
}

/** Repository does not exist, or is private and inaccessible with this token. */
export class RepoNotFoundError extends Error {
  constructor(public readonly repo: string) {
    super(`Repository not found or inaccessible: ${repo}`);
    this.name = "RepoNotFoundError";
  }
}

/** GitHub API rate limit exceeded. */
export class RateLimitError extends Error {
  constructor() {
    super("GitHub API rate limit exceeded.");
    this.name = "RateLimitError";
  }
}

/** Map a raw Octokit error to a typed domain error where possible. */
export function classifyGitHubError(err: unknown, repoLabel: string): Error {
  const e = err as {
    status?: number;
    response?: { headers?: Record<string, string> };
  };
  const status = e?.status;
  if (status === 404) return new RepoNotFoundError(repoLabel);
  if (status === 429) return new RateLimitError();
  if (status === 403) {
    const remaining = e?.response?.headers?.["x-ratelimit-remaining"];
    if (remaining === "0") return new RateLimitError();
    // A 403 with quota left usually means the private repo isn't accessible.
    return new RepoNotFoundError(repoLabel);
  }
  return err instanceof Error ? err : new Error(String(err));
}

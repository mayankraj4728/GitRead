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

import type { Octokit } from "@octokit/rest";
import { cached, cacheKeys, TTL } from "@/lib/cache";
import { withRetry } from "./client";

export class FileNotFoundError extends Error {
  constructor(path: string) {
    super(`File not found: ${path}`);
    this.name = "FileNotFoundError";
  }
}

/**
 * Fetch raw file text at a specific commit sha. Cached long-term because the
 * key is pinned to the sha — a new push produces a new sha, hence a fresh key.
 */
export async function getFileContent(
  owner: string,
  name: string,
  sha: string,
  path: string,
  octokit: Octokit,
): Promise<string> {
  const fullName = `${owner}/${name}`;
  return cached(cacheKeys.file(fullName, sha, path), TTL.content, async () => {
    const { data } = await withRetry(() =>
      octokit.repos.getContent({ owner, repo: name, path, ref: sha }),
    );
    if (Array.isArray(data) || data.type !== "file" || !("content" in data)) {
      throw new FileNotFoundError(path);
    }
    return Buffer.from(data.content, "base64").toString("utf-8");
  });
}

/**
 * Resolve a raw URL for a repo asset (used to rewrite relative image srcs so
 * they load from raw.githubusercontent.com).
 */
export function rawUrl(fullName: string, sha: string, path: string): string {
  return `https://raw.githubusercontent.com/${fullName}/${sha}/${path}`;
}

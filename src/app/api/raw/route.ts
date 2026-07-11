import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getGitHubToken } from "@/lib/github/client";

const API = "https://api.github.com";

function ghHeaders(token: string, accept: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: accept,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "GitRead",
  };
}

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

/** Blob sha for a path at a commit — used to fetch files larger than 1 MB. */
async function blobSha(
  owner: string,
  name: string,
  sha: string,
  path: string,
  token: string,
): Promise<string | null> {
  const res = await fetch(`${API}/repos/${owner}/${name}/git/trees/${sha}?recursive=1`, {
    headers: ghHeaders(token, "application/vnd.github+json"),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { tree?: Array<{ path?: string; type?: string; sha?: string }> };
  const entry = data.tree?.find((n) => n.path === path && n.type === "blob");
  return entry?.sha ?? null;
}

/**
 * Stream a repository file's raw bytes through the user's token, so the browser
 * can render it inline (PDFs, etc.) for both public AND private repos.
 * Query: ?repo=owner/name&path=<file>&sha=<commit>
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new Response(null, { status: 401 });
  const token = await getGitHubToken(session.user.id);
  if (!token) return new Response(null, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const repo = sp.get("repo") ?? "";
  const path = sp.get("path") ?? "";
  const sha = sp.get("sha") ?? "";
  const [owner, name] = repo.split("/");
  if (!owner || !name || !path || !sha) return new Response(null, { status: 400 });

  // First try the contents API (raw, up to 1 MB).
  let res = await fetch(
    `${API}/repos/${owner}/${name}/contents/${encodePath(path)}?ref=${sha}`,
    { headers: ghHeaders(token, "application/vnd.github.raw") },
  );

  // Larger files: resolve the blob sha and use the git blob API (up to 100 MB).
  if (res.status === 403) {
    const bsha = await blobSha(owner, name, sha, path, token);
    if (!bsha) return new Response(null, { status: 404 });
    res = await fetch(`${API}/repos/${owner}/${name}/git/blobs/${bsha}`, {
      headers: ghHeaders(token, "application/vnd.github.raw"),
    });
  }

  if (!res.ok) return new Response(null, { status: res.status === 404 ? 404 : 502 });

  const bytes = await res.arrayBuffer();
  const filename = path.split("/").pop() ?? "file";
  const isPdf = /\.pdf$/i.test(filename);

  return new Response(bytes, {
    headers: {
      "Content-Type": isPdf ? "application/pdf" : "application/octet-stream",
      "Content-Disposition": `inline; filename="${filename.replace(/"/g, "")}"`,
      // Pinned to the commit sha, so it's immutable.
      "Cache-Control": "private, max-age=3600",
    },
  });
}

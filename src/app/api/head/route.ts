import type { NextRequest } from "next/server";
import { requireOctokit, UnauthenticatedError } from "@/lib/github/client";
import { getRepo, getHeadSha } from "@/lib/github/repos.service";
import { parseRepoSegment } from "@/lib/github-url";

/**
 * Current HEAD commit sha for a repo — the cheap freshness probe used by the
 * background sync poll. /api/head?repo=owner/name(~ref)
 */
export async function GET(req: NextRequest) {
  const repoParam = req.nextUrl.searchParams.get("repo") ?? "";
  const [owner, segment] = repoParam.split("/");
  if (!owner || !segment) return new Response(null, { status: 400 });
  const { name, ref } = parseRepoSegment(segment);

  try {
    const { octokit } = await requireOctokit();
    const repo = await getRepo(owner, name, octokit);
    const sha = await getHeadSha(owner, name, ref ?? repo.defaultBranch, octokit);
    return Response.json({ sha });
  } catch (err) {
    if (err instanceof UnauthenticatedError) return new Response(null, { status: 401 });
    return new Response(null, { status: 502 });
  }
}

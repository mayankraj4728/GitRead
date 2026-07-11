import type { NextRequest } from "next/server";
import { searchRepo } from "@/lib/search";
import { UnauthenticatedError, RepoNotFoundError, RateLimitError } from "@/lib/github/client";
import { parseRepoSegment } from "@/lib/github-url";

/** In-repo search: /api/search?repo=owner/name(~ref)&q=term */
export async function GET(req: NextRequest) {
  const repo = req.nextUrl.searchParams.get("repo") ?? "";
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const [owner, segment] = repo.split("/");
  if (!owner || !segment) return new Response(null, { status: 400 });
  const { name, ref } = parseRepoSegment(segment);

  try {
    const data = await searchRepo(owner, name, q, ref);
    return Response.json(data);
  } catch (err) {
    if (err instanceof UnauthenticatedError) return new Response(null, { status: 401 });
    if (err instanceof RepoNotFoundError) return new Response(null, { status: 404 });
    if (err instanceof RateLimitError) return new Response(null, { status: 429 });
    return new Response(null, { status: 500 });
  }
}

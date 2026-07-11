import { getMyRepos } from "@/lib/reader";
import { UnauthenticatedError } from "@/lib/github/client";

/** Lightweight repo list for the command palette. */
export async function GET() {
  try {
    const repos = await getMyRepos();
    return Response.json(
      repos.map((r) => ({ owner: r.owner, name: r.name, fullName: r.fullName })),
    );
  } catch (err) {
    if (err instanceof UnauthenticatedError) return new Response(null, { status: 401 });
    return new Response(null, { status: 500 });
  }
}

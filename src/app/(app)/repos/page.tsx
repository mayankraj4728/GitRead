import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMyRepos, getMyStarredRepos } from "@/lib/reader";
import { getFavoriteRepoNames } from "@/lib/collections";
import { UnauthenticatedError, isAuthRevoked } from "@/lib/github/client";
import { purgeStaleSession } from "@/lib/purge-stale-session";
import { RepoGrid } from "@/components/repos/repo-grid";
import { OpenUrlBar } from "@/components/repos/open-url-bar";

export const metadata: Metadata = { title: "Library" };

export default async function ReposPage() {
  let repos;
  try {
    repos = await getMyRepos();
  } catch (err) {
    // No session (logged out from another tab) → back to login. The layout's
    // auth check doesn't re-run on client-side navigation, so the page must
    // handle it — otherwise the error crashes the route.
    if (err instanceof UnauthenticatedError) redirect("/");
    // Revoked/dead GitHub token → clear the stale session, back to login.
    if (isAuthRevoked(err)) await purgeStaleSession();
    throw err;
  }
  const [favorites, starred] = await Promise.all([
    getFavoriteRepoNames(),
    // Starred repos are a bonus tab — never let them break the library page.
    getMyStarredRepos().catch(() => []),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Your library</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {repos.length} repositories · or paste any public repo below.
        </p>
      </div>
      <section className="mb-8">
        <OpenUrlBar />
      </section>
      <RepoGrid repos={repos} starred={starred} favorites={[...favorites]} />
    </main>
  );
}

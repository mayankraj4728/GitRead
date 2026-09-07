import { redirect } from "next/navigation";
import { getMyRepos, getMyStarredRepos } from "@/lib/reader";
import { getFavoriteRepoNames } from "@/lib/collections";
import { UnauthenticatedError, isAuthRevoked } from "@/lib/github/client";
import { purgeStaleSession } from "@/lib/purge-stale-session";
import { Skeleton } from "@/components/ui/skeleton";
import { RepoGrid } from "@/components/repos/repo-grid";

/**
 * Fetch the user's repos, redirecting/purging on a dead session. Shared by the
 * count line and the grid; `getMyRepos()` is memoized (React `cache`) +
 * Redis-cached, so calling it from both streams costs one GitHub round-trip.
 */
async function loadRepos() {
  try {
    return await getMyRepos();
  } catch (err) {
    // No session (logged out from another tab) → back to login. The layout's
    // auth check doesn't re-run on client-side navigation.
    if (err instanceof UnauthenticatedError) redirect("/");
    // Revoked/dead GitHub token → clear the stale session, back to login.
    if (isAuthRevoked(err)) await purgeStaleSession();
    throw err;
  }
}

/** The "N repositories · or paste any public repo below" subtitle. */
export async function RepoCountLine() {
  const repos = await loadRepos();
  return (
    <p className="mt-1 text-sm text-muted-foreground">
      {repos.length} repositories · or paste any public repo below.
    </p>
  );
}

/** The searchable, filterable grid (repos + starred + favorites). */
export async function RepoGridSection() {
  const [repos, favorites, starred] = await Promise.all([
    loadRepos(),
    getFavoriteRepoNames(),
    // Starred repos are a bonus tab — never let them break the library page.
    getMyStarredRepos().catch(() => []),
  ]);
  return <RepoGrid repos={repos} starred={starred} favorites={[...favorites]} />;
}

/** Fallback for the count subtitle. */
export function RepoCountSkeleton() {
  return <Skeleton className="mt-1 h-4 w-64" />;
}

/** Fallback: a grid of repo-card skeletons matching the real layout. */
export function RepoGridSkeleton() {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <Skeleton key={i} className="h-40 rounded-xl" />
      ))}
    </div>
  );
}

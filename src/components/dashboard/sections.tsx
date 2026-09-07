import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyRepos } from "@/lib/reader";
import { getContinueReading, getRecentlyRead } from "@/app/actions/progress";
import { getFavoriteRepoNames, getBookmarks } from "@/lib/collections";
import { UnauthenticatedError, isAuthRevoked } from "@/lib/github/client";
import { purgeStaleSession } from "@/lib/purge-stale-session";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionHeading } from "@/components/dashboard/section-heading";
import { ContinueReading } from "@/components/dashboard/continue-reading";
import { RecentDocs } from "@/components/dashboard/recent-docs";
import { RepoCard } from "@/components/repos/repo-card";

/**
 * Each dashboard section awaits its own data so it can be wrapped in its own
 * <Suspense> boundary — the page shell streams immediately and each section
 * fills in as its data resolves, instead of blocking on the slowest fetch.
 *
 * `getMyRepos()` is shared by the Favorites and Recent-repos sections; it's
 * memoized (React `cache`) + Redis-cached, so calling it twice per request
 * costs one GitHub round-trip.
 */

/** Fetch the user's repos, degrading gracefully on a dead/revoked session. */
async function safeGetMyRepos() {
  return getMyRepos().catch(async (err) => {
    if (err instanceof UnauthenticatedError) redirect("/");
    if (isAuthRevoked(err)) await purgeStaleSession();
    return [];
  });
}

// ── Continue reading ─────────────────────────────────────────────
export async function ContinueReadingSection() {
  const cont = await getContinueReading();
  if (!cont) return null;
  return (
    <section className="mb-10">
      <ContinueReading progress={cont} />
    </section>
  );
}

// ── Favorites ────────────────────────────────────────────────────
export async function FavoritesSection() {
  const [repos, favorites] = await Promise.all([safeGetMyRepos(), getFavoriteRepoNames()]);
  const favoriteRepos = repos.filter((r) => favorites.has(r.fullName)).slice(0, 6);
  if (favoriteRepos.length === 0) return null;
  return (
    <section className="mb-12">
      <SectionHeading title="Favorites" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {favoriteRepos.map((repo) => (
          <RepoCard key={repo.id} repo={repo} favorited />
        ))}
      </div>
    </section>
  );
}

// ── Recent repositories ──────────────────────────────────────────
export async function RecentReposSection() {
  const [repos, favorites] = await Promise.all([safeGetMyRepos(), getFavoriteRepoNames()]);
  const recentRepos = repos.slice(0, 6);
  return (
    <section className="mb-12">
      <SectionHeading title="Recent repositories" href="/repos" />
      {recentRepos.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recentRepos.map((repo) => (
            <RepoCard key={repo.id} repo={repo} favorited={favorites.has(repo.fullName)} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No repositories found yet.{" "}
            <Link href="/repos" className="font-medium text-accent hover:underline">
              Browse your library →
            </Link>
          </p>
        </div>
      )}
    </section>
  );
}

// ── Recently read + Bookmarks (bottom two-column row) ─────────────
export async function RecentlyReadSection() {
  const recent = await getRecentlyRead(6);
  if (recent.length === 0) return null;
  return (
    <section className="mb-4 min-w-0">
      <SectionHeading title="Recently read" />
      <RecentDocs docs={recent} />
    </section>
  );
}

export async function BookmarksSection() {
  const bookmarks = await getBookmarks(6);
  if (bookmarks.length === 0) return null;
  const bookmarkDocs = bookmarks.map((b) => ({
    repoFullName: b.repoFullName,
    filePath: b.filePath,
    title: b.label,
    openedAt: b.createdAt,
  }));
  return (
    <section className="mb-4 min-w-0">
      <SectionHeading title="Bookmarks" />
      <RecentDocs docs={bookmarkDocs} />
    </section>
  );
}

// ── Skeleton fallbacks ───────────────────────────────────────────

/** A grid of repo-card skeletons, matching the real 3-column layout. */
export function RepoGridSkeleton({ action }: { action?: boolean }) {
  return (
    <section className="mb-12">
      <div className="mb-4 flex items-baseline justify-between">
        <Skeleton className="h-6 w-40" />
        {action && <Skeleton className="h-4 w-16" />}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    </section>
  );
}

/** A list of doc-row skeletons for the Recently read / Bookmarks columns. */
export function DocListSkeleton() {
  return (
    <section className="mb-4 min-w-0">
      <Skeleton className="mb-4 h-6 w-40" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    </section>
  );
}

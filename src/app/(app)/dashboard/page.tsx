import Link from "next/link";
import { auth } from "@/lib/auth";
import { getMyRepos } from "@/lib/reader";
import { getContinueReading, getRecentlyRead } from "@/app/actions/progress";
import { SectionHeading } from "@/components/dashboard/section-heading";
import { ContinueReading } from "@/components/dashboard/continue-reading";
import { RecentDocs } from "@/components/dashboard/recent-docs";
import { RepoCard } from "@/components/repos/repo-card";

export const metadata = { title: "Home" };

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0];

  const [repos, cont, recent] = await Promise.all([
    getMyRepos().catch(() => []),
    getContinueReading(),
    getRecentlyRead(6),
  ]);

  const recentRepos = repos.slice(0, 6);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="mb-10">
        <p className="text-sm text-muted-foreground">{greeting()},</p>
        <h1 className="text-3xl font-semibold tracking-tight">{firstName ?? "welcome back"} 👋</h1>
      </header>

      {cont && (
        <section className="mb-10">
          <ContinueReading progress={cont} />
        </section>
      )}

      <section className="mb-12">
        <SectionHeading title="Recent repositories" href="/repos" />
        {recentRepos.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentRepos.map((repo) => (
              <RepoCard key={repo.id} repo={repo} />
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

      {recent.length > 0 && (
        <section className="mb-12 max-w-3xl">
          <SectionHeading title="Recently read" />
          <RecentDocs docs={recent} />
        </section>
      )}
    </main>
  );
}

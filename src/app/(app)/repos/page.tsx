import type { Metadata } from "next";
import { getMyRepos } from "@/lib/reader";
import { getFavoriteRepoNames } from "@/lib/collections";
import { RepoGrid } from "@/components/repos/repo-grid";
import { OpenUrlBar } from "@/components/repos/open-url-bar";

export const metadata: Metadata = { title: "Library" };

export default async function ReposPage() {
  const [repos, favorites] = await Promise.all([getMyRepos(), getFavoriteRepoNames()]);

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
      <RepoGrid repos={repos} favorites={[...favorites]} />
    </main>
  );
}

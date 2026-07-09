import type { Metadata } from "next";
import { getMyRepos } from "@/lib/reader";
import { RepoGrid } from "@/components/repos/repo-grid";

export const metadata: Metadata = { title: "Library" };

export default async function ReposPage() {
  const repos = await getMyRepos();

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Your library</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {repos.length} repositories · open one to start reading.
        </p>
      </div>
      <RepoGrid repos={repos} />
    </main>
  );
}

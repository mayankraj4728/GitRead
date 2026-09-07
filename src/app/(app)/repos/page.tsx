import type { Metadata } from "next";
import { Suspense } from "react";
import { OpenUrlBar } from "@/components/repos/open-url-bar";
import {
  RepoCountLine,
  RepoGridSection,
  RepoCountSkeleton,
  RepoGridSkeleton,
} from "@/components/repos/library-section";

export const metadata: Metadata = { title: "Library" };

export default function ReposPage() {
  // Header + OpenUrlBar paint instantly; the repo count line and the grid each
  // stream in behind their own <Suspense> once the GitHub/DB fetches resolve.
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Your library</h1>
        <Suspense fallback={<RepoCountSkeleton />}>
          <RepoCountLine />
        </Suspense>
      </div>
      <section className="mb-8">
        <OpenUrlBar />
      </section>
      <Suspense fallback={<RepoGridSkeleton />}>
        <RepoGridSection />
      </Suspense>
    </main>
  );
}

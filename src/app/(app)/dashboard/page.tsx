import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { OpenUrlBar } from "@/components/repos/open-url-bar";
import {
  ContinueReadingSection,
  FavoritesSection,
  RecentReposSection,
  RecentlyReadSection,
  BookmarksSection,
  RepoGridSkeleton,
  DocListSkeleton,
} from "@/components/dashboard/sections";

export const metadata = { title: "Home" };

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const session = await auth();
  // Session died since the layout rendered (logged out from another tab) —
  // the layout's auth check doesn't re-run on client-side navigation.
  if (!session?.user?.id) redirect("/");
  const firstName = session.user.name?.split(" ")[0];

  // The shell (header + OpenUrlBar) renders instantly. Each data section
  // awaits its own fetch inside its own <Suspense> boundary, so the page
  // streams section-by-section instead of blocking on the slowest call.
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <p className="text-sm text-muted-foreground">{greeting()},</p>
        <h1 className="text-3xl font-semibold tracking-tight">{firstName ?? "welcome back"} 👋</h1>
      </header>

      <section className="mb-10">
        <OpenUrlBar />
      </section>

      {/* Continue reading is often quick (single DB row) — no skeleton needed;
          it simply appears when ready and collapses to nothing if absent. */}
      <Suspense fallback={null}>
        <ContinueReadingSection />
      </Suspense>

      <Suspense fallback={null}>
        <FavoritesSection />
      </Suspense>

      <Suspense fallback={<RepoGridSkeleton action />}>
        <RecentReposSection />
      </Suspense>

      {/* min-w-0 lets each section shrink below its content's natural width —
          without it, long nowrap doc titles blow the grid past the phone
          viewport and the whole page zooms out unevenly. */}
      <div className="grid gap-8 lg:grid-cols-2">
        <Suspense fallback={<DocListSkeleton />}>
          <RecentlyReadSection />
        </Suspense>

        <Suspense fallback={<DocListSkeleton />}>
          <BookmarksSection />
        </Suspense>
      </div>
    </main>
  );
}

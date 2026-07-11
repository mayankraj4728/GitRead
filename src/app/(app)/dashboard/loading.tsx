import { Skeleton } from "@/components/ui/skeleton";

/** Dashboard skeleton shown while data loads. */
export default function DashboardLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-56" />
      </div>
      <Skeleton className="mb-10 h-12 w-full rounded-xl" />
      <Skeleton className="mb-4 h-6 w-40" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    </main>
  );
}

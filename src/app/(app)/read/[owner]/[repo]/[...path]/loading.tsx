import { Skeleton } from "@/components/ui/skeleton";

/** Reader skeleton shown while a document loads. */
export default function DocLoading() {
  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-5 py-10 sm:px-8 xl:grid-cols-[minmax(0,1fr)_15rem]">
      <div className="min-w-0 space-y-4">
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-10 w-3/4" />
        <div className="space-y-3 pt-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className={i % 4 === 3 ? "h-4 w-1/2" : "h-4 w-full"} />
          ))}
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
      <div className="hidden xl:block">
        <div className="sticky top-24 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-40" />
          ))}
        </div>
      </div>
    </div>
  );
}

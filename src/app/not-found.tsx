import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <span className="grid size-16 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <Compass className="size-8" />
      </span>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Lost the thread</h1>
      <p className="mt-2 max-w-sm text-muted-foreground">
        We couldn&apos;t find that page. It may have moved, or the repository isn&apos;t
        accessible.
      </p>
      <Link
        href="/dashboard"
        className="mt-8 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
      >
        Back home
      </Link>
    </main>
  );
}

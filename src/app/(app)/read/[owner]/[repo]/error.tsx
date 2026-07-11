"use client";

import { useEffect } from "react";
import { RefreshCw, CloudOff } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Recoverable error screen for the reader (e.g. a transient GitHub 5xx). */
export default function ReadError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[reader]", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <CloudOff className="size-7" />
      </span>
      <h1 className="mt-5 text-xl font-semibold">Couldn&apos;t load this document</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        GitHub returned a temporary error while fetching this file. This is usually transient —
        please try again.
      </p>
      <Button className="mt-6" onClick={() => reset()}>
        <RefreshCw className="size-4" /> Try again
      </Button>
    </div>
  );
}

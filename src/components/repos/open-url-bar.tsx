"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, Github, Loader2 } from "lucide-react";
import { openRepo, type OpenRepoState } from "@/app/actions/open-repo";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  "vercel/next.js",
  "sindresorhus/awesome",
  "facebook/react",
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="Open repository"
      className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg bg-accent text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
    </button>
  );
}

/** Paste any public GitHub URL to open it in the reader. */
export function OpenUrlBar() {
  const [state, formAction] = useActionState<OpenRepoState, FormData>(openRepo, {});

  return (
    <div>
      <form action={formAction} className="relative">
        <Github className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          name="url"
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder="Paste any GitHub repo URL to read it — e.g. github.com/vercel/next.js"
          aria-label="GitHub repository URL"
          aria-invalid={!!state.error}
          className={cn(
            "h-12 w-full rounded-xl border bg-card pl-11 pr-14 text-sm outline-none ring-ring transition-shadow placeholder:text-muted-foreground focus-visible:ring-2",
            state.error ? "border-danger" : "border-border",
          )}
        />
        <SubmitButton />
      </form>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 pl-1 text-xs text-muted-foreground">
        {state.error ? (
          <span className="text-danger">{state.error}</span>
        ) : (
          <>
            <span>Try:</span>
            {EXAMPLES.map((ex) => (
              <form key={ex} action={formAction} className="inline">
                <input type="hidden" name="url" value={ex} />
                <button
                  type="submit"
                  className="rounded-md bg-muted px-2 py-0.5 font-mono transition-colors hover:text-foreground"
                >
                  {ex}
                </button>
              </form>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

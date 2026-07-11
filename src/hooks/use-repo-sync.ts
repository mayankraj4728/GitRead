"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/stores/toast";

const POLL_MS = 90_000; // 90s — HEAD sha is cached ~30s server-side anyway

/**
 * Background GitHub sync. Periodically checks the repo's HEAD sha and, when a
 * new commit appears, offers a one-tap refresh (soft `router.refresh()` — no
 * full page reload). Pauses while the tab is hidden to save API calls.
 */
export function useRepoSync(repoFullName: string | null, loadedSha: string): void {
  const router = useRouter();
  const notifiedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!repoFullName) return;
    notifiedFor.current = null;
    let cancelled = false;

    const check = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const res = await fetch(`/api/head?repo=${encodeURIComponent(repoFullName)}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const { sha } = (await res.json()) as { sha: string };
        if (cancelled || !sha || sha === loadedSha || sha === notifiedFor.current) return;
        notifiedFor.current = sha; // avoid repeat toasts for the same commit
        toast.info("New changes were pushed to this repository.", {
          label: "Refresh",
          onClick: () => router.refresh(),
        });
      } catch {
        /* transient — ignore */
      }
    };

    const interval = setInterval(check, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [repoFullName, loadedSha, router]);
}

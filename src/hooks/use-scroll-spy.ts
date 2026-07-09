"use client";

import { useEffect, useState } from "react";

/**
 * Returns the id of the heading the reader is currently on, for TOC
 * highlighting. Deterministic: the active heading is the last one whose top has
 * scrolled above the offset line — so the highlight always tracks the scroll.
 */
export function useScrollSpy(ids: string[], offset = 120): string | null {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);

  useEffect(() => {
    if (ids.length === 0) return;

    const compute = () => {
      let current = ids[0] ?? null;

      // If we're at the very bottom, activate the last heading.
      const scrolledToBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (scrolledToBottom) {
        setActive(ids[ids.length - 1]);
        return;
      }

      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top - offset <= 0) current = id;
        else break;
      }
      setActive(current);
    };

    compute();
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
  }, [ids, offset]);

  return active;
}

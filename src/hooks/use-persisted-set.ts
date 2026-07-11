"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * A Set<string> persisted to localStorage. Used to remember which folders are
 * expanded in the file tree, per repository.
 */
export function usePersistedSet(
  storageKey: string,
  initial: string[] = [],
): {
  has: (v: string) => boolean;
  toggle: (v: string) => void;
  add: (v: string) => void;
} {
  const [set, setSet] = useState<Set<string>>(() => new Set(initial));

  // Hydrate from storage after mount (avoids SSR mismatch).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setSet(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const toggle = useCallback(
    (v: string) => {
      setSet((prev) => {
        const next = new Set(prev);
        if (next.has(v)) next.delete(v);
        else next.add(v);
        try {
          localStorage.setItem(storageKey, JSON.stringify([...next]));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [storageKey],
  );

  const add = useCallback((v: string) => setSet((prev) => new Set(prev).add(v)), []);
  const has = useCallback((v: string) => set.has(v), [set]);

  return { has, toggle, add };
}

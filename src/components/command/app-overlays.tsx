"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { CommandPalette } from "./command-palette";
import { SearchOverlay } from "./search-overlay";
import { HelpOverlay } from "./help-overlay";
import { useUi } from "@/stores/ui";
import { useReaderNav, usePrevNext } from "@/stores/reader-nav";
import { useReaderPrefs } from "@/stores/reader-prefs";

function isTyping(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null;
  if (!node) return false;
  const tag = node.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || node.isContentEditable;
}

/** Mounts global overlays and wires keyboard shortcuts. */
export function AppOverlays() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const overlay = useUi((s) => s.overlay);
  const openOverlay = useUi((s) => s.open);
  const toggleOverlay = useUi((s) => s.toggle);
  const toggleZen = useReaderPrefs((s) => s.toggleZen);
  const repoFullName = useReaderNav((s) => s.repoFullName);
  const currentPath = useReaderNav((s) => s.currentPath);
  const { prev, next } = usePrevNext();

  useEffect(() => {
    const cycleTheme = () =>
      setTheme(theme === "light" ? "dark" : theme === "dark" ? "system" : "light");

    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggleOverlay("palette");
        return;
      }
      if (isTyping(e.target) || overlay !== null || e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case "/":
          e.preventDefault();
          openOverlay(repoFullName ? "search" : "palette");
          break;
        case "t":
          cycleTheme();
          break;
        case "z":
          toggleZen();
          break;
        case "b":
          if (repoFullName && currentPath) {
            window.dispatchEvent(new CustomEvent("gitread:toggle-bookmark"));
          }
          break;
        case "[":
          if (prev && repoFullName) router.push(`/read/${repoFullName}/${prev.path}`);
          break;
        case "]":
          if (next && repoFullName) router.push(`/read/${repoFullName}/${next.path}`);
          break;
        case "?":
          openOverlay("help");
          break;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    overlay,
    openOverlay,
    toggleOverlay,
    toggleZen,
    theme,
    setTheme,
    repoFullName,
    currentPath,
    prev,
    next,
    router,
  ]);

  return (
    <>
      <CommandPalette />
      <SearchOverlay />
      <HelpOverlay />
    </>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleBookmark } from "@/lib/collections-client";
import { toast } from "@/stores/toast";
import { cn } from "@/lib/utils";

interface Props {
  repoFullName: string;
  filePath: string;
  title: string;
  initial: boolean;
}

/** Toggles a bookmark for the current document (optimistic). */
export function BookmarkButton({ repoFullName, filePath, title, initial }: Props) {
  const [bookmarked, setBookmarked] = useState(initial);
  const [pending, start] = useTransition();

  const onClick = () => {
    const next = !bookmarked;
    setBookmarked(next); // optimistic
    start(async () => {
      try {
        const server = await toggleBookmark({ repoFullName, filePath, label: title });
        setBookmarked(server);
        toast.success(server ? "Bookmark added" : "Bookmark removed");
      } catch {
        setBookmarked(!next); // revert
        toast.error("Couldn't update bookmark");
      }
    });
  };

  // Respond to the global "b" keyboard shortcut.
  useEffect(() => {
    const handler = () => onClick();
    window.addEventListener("gitread:toggle-bookmark", handler);
    return () => window.removeEventListener("gitread:toggle-bookmark", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookmarked, repoFullName, filePath, title]);

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={bookmarked ? "Remove bookmark" : "Add bookmark"}
      aria-pressed={bookmarked}
      onClick={onClick}
      disabled={pending}
    >
      <Bookmark className={cn("size-4", bookmarked && "fill-accent text-accent")} />
    </Button>
  );
}

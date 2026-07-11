"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { toggleFavorite } from "@/lib/collections-client";
import { cn } from "@/lib/utils";

/** Star toggle overlaid on a repo card (won't trigger the card's link). */
export function FavoriteButton({
  repoFullName,
  initial,
}: {
  repoFullName: string;
  initial: boolean;
}) {
  const [favorited, setFavorited] = useState(initial);
  const [pending, start] = useTransition();

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !favorited;
    setFavorited(next);
    start(async () => {
      try {
        setFavorited(await toggleFavorite(repoFullName));
      } catch {
        setFavorited(!next);
      }
    });
  };

  return (
    <button
      onClick={onClick}
      disabled={pending}
      aria-label={favorited ? "Unfavorite" : "Favorite"}
      aria-pressed={favorited}
      className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Star className={cn("size-4", favorited && "fill-warning text-warning")} />
    </button>
  );
}

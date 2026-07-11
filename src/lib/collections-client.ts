/** Client toggle helpers for bookmarks & favorites (optimistic callers). */

export async function toggleBookmark(input: {
  repoFullName: string;
  filePath: string;
  label?: string;
}): Promise<boolean> {
  const res = await fetch("/api/bookmarks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to toggle bookmark");
  const data = (await res.json()) as { bookmarked: boolean };
  return data.bookmarked;
}

export async function toggleFavorite(repoFullName: string): Promise<boolean> {
  const res = await fetch("/api/favorites", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ repoFullName }),
  });
  if (!res.ok) throw new Error("Failed to toggle favorite");
  const data = (await res.json()) as { favorited: boolean };
  return data.favorited;
}

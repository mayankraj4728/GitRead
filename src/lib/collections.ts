import "server-only";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function userId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Set of repo fullNames the user has favorited. */
export async function getFavoriteRepoNames(): Promise<Set<string>> {
  const uid = await userId();
  if (!uid) return new Set();
  const rows = await prisma.favorite.findMany({
    where: { userId: uid },
    select: { repoFullName: true },
  });
  return new Set(rows.map((r) => r.repoFullName));
}

/** Whether a specific document is bookmarked. */
export async function isBookmarked(repoFullName: string, filePath: string): Promise<boolean> {
  const uid = await userId();
  if (!uid) return false;
  const row = await prisma.bookmark.findUnique({
    where: { userId_repoFullName_filePath: { userId: uid, repoFullName, filePath } },
  });
  return !!row;
}

/** The user's bookmarks, newest first. */
export async function getBookmarks(limit = 20): Promise<
  Array<{ repoFullName: string; filePath: string; label: string | null; createdAt: string }>
> {
  const uid = await userId();
  if (!uid) return [];
  const rows = await prisma.bookmark.findMany({
    where: { userId: uid },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    repoFullName: r.repoFullName,
    filePath: r.filePath,
    label: r.label,
    createdAt: r.createdAt.toISOString(),
  }));
}

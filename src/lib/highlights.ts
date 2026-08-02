import "server-only";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { HighlightInfo, HighlightColor } from "@/types";

/** All of the user's highlights for one document, oldest first. */
export async function getHighlights(
  repoFullName: string,
  filePath: string,
): Promise<HighlightInfo[]> {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) return [];
  const rows = await prisma.highlight.findMany({
    where: { userId: uid, repoFullName, filePath },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    repoFullName: r.repoFullName,
    filePath: r.filePath,
    text: r.text,
    prefix: r.prefix,
    suffix: r.suffix,
    occurrence: r.occurrence,
    color: r.color as HighlightColor,
    sha: r.sha,
    createdAt: r.createdAt.toISOString(),
  }));
}

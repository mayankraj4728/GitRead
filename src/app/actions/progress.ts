"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { ProgressInfo } from "@/types";

async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Record that a document was opened (upserts reading history). */
export async function recordOpen(input: {
  repoFullName: string;
  filePath: string;
  title: string;
}): Promise<void> {
  const userId = await requireUserId();
  if (!userId) return;
  const where = {
    userId_repoFullName_filePath: {
      userId,
      repoFullName: input.repoFullName,
      filePath: input.filePath,
    },
  };
  await prisma.recentlyRead.upsert({
    where,
    create: { userId, ...input },
    update: { title: input.title, openedAt: new Date() },
  });
}

/** Persist scroll progress for the current document. */
export async function saveProgress(input: {
  repoFullName: string;
  filePath: string;
  title: string;
  scrollPct: number;
  headingId?: string | null;
}): Promise<void> {
  const userId = await requireUserId();
  if (!userId) return;
  await prisma.readingProgress.upsert({
    where: {
      userId_repoFullName_filePath: {
        userId,
        repoFullName: input.repoFullName,
        filePath: input.filePath,
      },
    },
    create: {
      userId,
      repoFullName: input.repoFullName,
      filePath: input.filePath,
      title: input.title,
      scrollPct: clamp(input.scrollPct),
      headingId: input.headingId ?? null,
    },
    update: {
      scrollPct: clamp(input.scrollPct),
      headingId: input.headingId ?? null,
      title: input.title,
    },
  });
}

/** The single document to resume, if any (most recent, not finished). */
export async function getContinueReading(): Promise<ProgressInfo | null> {
  const userId = await requireUserId();
  if (!userId) return null;
  const row = await prisma.readingProgress.findFirst({
    where: { userId, scrollPct: { gt: 0.02, lt: 0.98 } },
    orderBy: { updatedAt: "desc" },
  });
  return row ? serialize(row) : null;
}

/** Recently opened documents (history), newest first. */
export async function getRecentlyRead(limit = 8): Promise<
  Array<{ repoFullName: string; filePath: string; title: string | null; openedAt: string }>
> {
  const userId = await requireUserId();
  if (!userId) return [];
  const rows = await prisma.recentlyRead.findMany({
    where: { userId },
    orderBy: { openedAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    repoFullName: r.repoFullName,
    filePath: r.filePath,
    title: r.title,
    openedAt: r.openedAt.toISOString(),
  }));
}

/** Progress for a specific doc, used to restore scroll position. */
export async function getProgress(
  repoFullName: string,
  filePath: string,
): Promise<ProgressInfo | null> {
  const userId = await requireUserId();
  if (!userId) return null;
  const row = await prisma.readingProgress.findUnique({
    where: { userId_repoFullName_filePath: { userId, repoFullName, filePath } },
  });
  return row ? serialize(row) : null;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function serialize(row: {
  repoFullName: string;
  filePath: string;
  title: string | null;
  scrollPct: number;
  headingId: string | null;
  updatedAt: Date;
}): ProgressInfo {
  return {
    repoFullName: row.repoFullName,
    filePath: row.filePath,
    title: row.title,
    scrollPct: row.scrollPct,
    headingId: row.headingId,
    updatedAt: row.updatedAt.toISOString(),
  };
}

import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Cap reading history per user — the dashboard only shows the latest handful,
// so keeping every doc a user ever opened just wastes storage.
const HISTORY_LIMIT = 50;

/** Delete a user's oldest history rows beyond the newest HISTORY_LIMIT. */
async function pruneHistory(userId: string): Promise<void> {
  const boundary = await prisma.recentlyRead.findMany({
    where: { userId },
    orderBy: { openedAt: "desc" },
    skip: HISTORY_LIMIT,
    take: 1,
    select: { openedAt: true },
  });
  if (boundary.length > 0) {
    await prisma.recentlyRead.deleteMany({
      where: { userId, openedAt: { lt: boundary[0].openedAt } },
    });
  }
}

/**
 * Reading-progress + history writes. Deliberately a route handler (not a Server
 * Action) so frequent saves during scrolling don't trigger a route re-render —
 * that reconcile is what janks scrolling on very large files.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new Response(null, { status: 401 });
  const userId = session.user.id;

  let body: {
    type?: "open" | "progress";
    repoFullName?: string;
    filePath?: string;
    title?: string;
    scrollPct?: number;
    headingId?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }

  const { type, repoFullName, filePath, title } = body;
  if (!repoFullName || !filePath) return new Response(null, { status: 400 });

  const key = { userId_repoFullName_filePath: { userId, repoFullName, filePath } };

  if (type === "open") {
    await prisma.recentlyRead.upsert({
      where: key,
      create: { userId, repoFullName, filePath, title: title ?? null },
      update: { title: title ?? null, openedAt: new Date() },
    });
    // Keep only the newest HISTORY_LIMIT entries (best-effort; never fail here).
    try {
      await pruneHistory(userId);
    } catch {
      /* ignore */
    }
  } else {
    const scrollPct = Math.max(0, Math.min(1, Number(body.scrollPct) || 0));
    await prisma.readingProgress.upsert({
      where: key,
      create: {
        userId,
        repoFullName,
        filePath,
        title: title ?? null,
        scrollPct,
        headingId: body.headingId ?? null,
      },
      update: { scrollPct, headingId: body.headingId ?? null, title: title ?? null },
    });
  }

  return new Response(null, { status: 204 });
}

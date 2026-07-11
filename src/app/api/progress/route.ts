import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

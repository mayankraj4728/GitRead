import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Toggle a bookmark for a document. Returns the new state. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new Response(null, { status: 401 });
  const userId = session.user.id;

  let body: { repoFullName?: string; filePath?: string; label?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const { repoFullName, filePath, label } = body;
  if (!repoFullName || !filePath) return new Response(null, { status: 400 });

  const where = { userId_repoFullName_filePath: { userId, repoFullName, filePath } };
  const existing = await prisma.bookmark.findUnique({ where });

  if (existing) {
    await prisma.bookmark.delete({ where });
    return Response.json({ bookmarked: false });
  }
  await prisma.bookmark.create({
    data: { userId, repoFullName, filePath, label: label ?? null },
  });
  return Response.json({ bookmarked: true });
}

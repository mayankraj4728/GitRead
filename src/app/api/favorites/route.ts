import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Toggle a favorite for a repository. Returns the new state. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new Response(null, { status: 401 });
  const userId = session.user.id;

  let body: { repoFullName?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const { repoFullName } = body;
  if (!repoFullName) return new Response(null, { status: 400 });

  const where = { userId_repoFullName: { userId, repoFullName } };
  const existing = await prisma.favorite.findUnique({ where });

  if (existing) {
    await prisma.favorite.delete({ where });
    return Response.json({ favorited: false });
  }
  await prisma.favorite.create({ data: { userId, repoFullName } });
  return Response.json({ favorited: true });
}

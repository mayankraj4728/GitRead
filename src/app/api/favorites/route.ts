import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Toggle a favorite for a repository. Returns the new state. Race-safe. */
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
    try {
      await prisma.favorite.delete({ where });
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025")) throw err;
    }
    return Response.json({ favorited: false });
  }

  try {
    await prisma.favorite.create({ data: { userId, repoFullName } });
  } catch (err) {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
  }
  return Response.json({ favorited: true });
}


import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { HIGHLIGHT_COLORS, type HighlightColor } from "@/types";

// Bound highlight size — a "highlight" of a whole page isn't meaningful and
// only bloats storage. Context windows stay small by construction.
const MAX_TEXT = 2000;
const MAX_CONTEXT = 64;
// Cap per document (like HISTORY_LIMIT for reading history) — abuse insurance.
const MAX_PER_DOC = 500;

function isColor(v: unknown): v is HighlightColor {
  return typeof v === "string" && (HIGHLIGHT_COLORS as readonly string[]).includes(v);
}

type Row = {
  id: string;
  repoFullName: string;
  filePath: string;
  text: string;
  prefix: string;
  suffix: string;
  occurrence: number;
  color: string;
  sha: string;
  createdAt: Date;
};

function serialize(r: Row) {
  return {
    id: r.id,
    repoFullName: r.repoFullName,
    filePath: r.filePath,
    text: r.text,
    prefix: r.prefix,
    suffix: r.suffix,
    occurrence: r.occurrence,
    color: r.color,
    sha: r.sha,
    createdAt: r.createdAt.toISOString(),
  };
}

/** List highlights for a document: /api/highlights?repo=…&path=… */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new Response(null, { status: 401 });

  const repoFullName = req.nextUrl.searchParams.get("repo") ?? "";
  const filePath = req.nextUrl.searchParams.get("path") ?? "";
  if (!repoFullName || !filePath) return new Response(null, { status: 400 });

  const rows = await prisma.highlight.findMany({
    where: { userId: session.user.id, repoFullName, filePath },
    orderBy: { createdAt: "asc" },
  });
  return Response.json({ highlights: rows.map(serialize) });
}

/** Create a highlight. Returns the stored row. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new Response(null, { status: 401 });
  const userId = session.user.id;

  let body: {
    repoFullName?: string;
    filePath?: string;
    text?: string;
    prefix?: string;
    suffix?: string;
    occurrence?: number;
    color?: string;
    sha?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }

  const { repoFullName, filePath, text, sha } = body;
  if (!repoFullName || !filePath || !text?.trim() || !sha) {
    return new Response(null, { status: 400 });
  }
  if (text.length > MAX_TEXT) return new Response(null, { status: 413 });

  const count = await prisma.highlight.count({
    where: { userId, repoFullName, filePath },
  });
  if (count >= MAX_PER_DOC) return new Response(null, { status: 409 });

  const row = await prisma.highlight.create({
    data: {
      userId,
      repoFullName,
      filePath,
      text,
      prefix: (body.prefix ?? "").slice(-MAX_CONTEXT),
      suffix: (body.suffix ?? "").slice(0, MAX_CONTEXT),
      occurrence: Math.max(0, Math.trunc(Number(body.occurrence) || 0)),
      color: isColor(body.color) ? body.color : "yellow",
      sha,
    },
  });
  return Response.json({ highlight: serialize(row) });
}

/** Change a highlight's color: { id, color }. */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new Response(null, { status: 401 });

  let body: { id?: string; color?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!body.id || !isColor(body.color)) return new Response(null, { status: 400 });

  // updateMany scoped to the user so nobody can touch someone else's row.
  const { count } = await prisma.highlight.updateMany({
    where: { id: body.id, userId: session.user.id },
    data: { color: body.color },
  });
  if (count === 0) return new Response(null, { status: 404 });
  return Response.json({ ok: true });
}

/** Delete a highlight: { id }. Race-safe like bookmarks. */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new Response(null, { status: 401 });

  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!body.id) return new Response(null, { status: 400 });

  try {
    await prisma.highlight.delete({
      where: { id: body.id, userId: session.user.id },
    });
  } catch (err) {
    // Already deleted by a concurrent request — still "deleted".
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025")) throw err;
  }
  return Response.json({ ok: true });
}

import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * The stored GitHub token no longer works (revoked on GitHub, or the user row
 * was removed). Delete the user's session rows — which invalidates their
 * cookie — and send them to the login page. Their data (bookmarks, progress,
 * history) is intentionally left untouched; it reattaches on the next sign-in.
 */
export async function purgeStaleSession(): Promise<never> {
  const session = await auth();
  if (session?.user?.id) {
    try {
      await prisma.session.deleteMany({ where: { userId: session.user.id } });
    } catch {
      /* best-effort */
    }
  }
  redirect("/");
}

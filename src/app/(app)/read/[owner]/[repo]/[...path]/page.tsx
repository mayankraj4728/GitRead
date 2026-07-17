import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDocument } from "@/lib/reader";
import { getProgress } from "@/app/actions/progress";
import { isBookmarked } from "@/lib/collections";
import { FileNotFoundError } from "@/lib/github/content.service";
import { RepoNotFoundError, RateLimitError, TokenRevokedError } from "@/lib/github/client";
import { purgeStaleSession } from "@/lib/purge-stale-session";
import { parseRepoSegment } from "@/lib/github-url";
import { ReaderView } from "@/components/reader/reader-view";
import { RepoError } from "@/components/reader/repo-error";

interface Props {
  params: Promise<{ owner: string; repo: string; path: string[] }>;
}

function decodePath(segments: string[]): string {
  return segments.map((s) => decodeURIComponent(s)).join("/");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { owner, repo, path } = await params;
  const { name, ref } = parseRepoSegment(repo);
  try {
    const doc = await getDocument(owner, name, decodePath(path), ref);
    return { title: doc.title };
  } catch {
    return { title: "Document" };
  }
}

export default async function DocPage({ params }: Props) {
  const { owner, repo, path } = await params;
  const { name, ref } = parseRepoSegment(repo);
  const filePath = decodePath(path);

  let doc;
  try {
    doc = await getDocument(owner, name, filePath, ref);
  } catch (err) {
    if (err instanceof TokenRevokedError) await purgeStaleSession();
    if (err instanceof FileNotFoundError) notFound();
    if (err instanceof RepoNotFoundError) return <RepoError kind="not-found" repo={`${owner}/${name}`} />;
    if (err instanceof RateLimitError) return <RepoError kind="rate-limit" />;
    throw err;
  }

  // Progress + bookmark keys use the app-level slug (doc.repoFullName).
  const [saved, bookmarked] = await Promise.all([
    getProgress(doc.repoFullName, filePath),
    isBookmarked(doc.repoFullName, filePath),
  ]);

  return <ReaderView doc={doc} restoreTo={saved?.scrollPct ?? null} bookmarked={bookmarked} />;
}

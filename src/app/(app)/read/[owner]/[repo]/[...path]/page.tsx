import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDocument } from "@/lib/reader";
import { getProgress } from "@/app/actions/progress";
import { FileNotFoundError } from "@/lib/github/content.service";
import { ReaderView } from "@/components/reader/reader-view";

interface Props {
  params: Promise<{ owner: string; repo: string; path: string[] }>;
}

function decodePath(segments: string[]): string {
  return segments.map((s) => decodeURIComponent(s)).join("/");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { owner, repo, path } = await params;
  try {
    const doc = await getDocument(owner, repo, decodePath(path));
    return { title: doc.title };
  } catch {
    return { title: "Document" };
  }
}

export default async function DocPage({ params }: Props) {
  const { owner, repo, path } = await params;
  const filePath = decodePath(path);

  let doc;
  try {
    doc = await getDocument(owner, repo, filePath);
  } catch (err) {
    if (err instanceof FileNotFoundError) notFound();
    throw err;
  }

  const saved = await getProgress(`${owner}/${repo}`, filePath);

  return <ReaderView doc={doc} restoreTo={saved?.scrollPct ?? null} />;
}

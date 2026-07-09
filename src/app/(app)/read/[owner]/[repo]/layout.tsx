import { notFound } from "next/navigation";
import { getRepoBundle } from "@/lib/reader";
import { ReaderShell } from "@/components/reader/reader-shell";

interface Props {
  children: React.ReactNode;
  params: Promise<{ owner: string; repo: string }>;
}

export default async function ReadLayout({ children, params }: Props) {
  const { owner, repo } = await params;

  let bundle;
  try {
    bundle = await getRepoBundle(owner, repo);
  } catch {
    notFound();
  }

  return (
    <ReaderShell repo={bundle.repo} tree={bundle.tree} count={bundle.markdownCount}>
      {children}
    </ReaderShell>
  );
}

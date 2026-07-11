import { redirect } from "next/navigation";
import { getRepoBundle } from "@/lib/reader";
import { findEntryDoc } from "@/lib/github/tree.service";
import { RepoNotFoundError, RateLimitError } from "@/lib/github/client";
import { parseRepoSegment } from "@/lib/github-url";
import { RepoError } from "@/components/reader/repo-error";

interface Props {
  params: Promise<{ owner: string; repo: string }>;
  searchParams: Promise<{ in?: string }>;
}

export default async function RepoIndexPage({ params, searchParams }: Props) {
  const { owner, repo } = await params;
  const { in: folder } = await searchParams;
  const { name, ref } = parseRepoSegment(repo);

  let bundle;
  try {
    bundle = await getRepoBundle(owner, name, ref);
  } catch (err) {
    if (err instanceof RepoNotFoundError) return <RepoError kind="not-found" repo={`${owner}/${name}`} />;
    if (err instanceof RateLimitError) return <RepoError kind="rate-limit" />;
    return <RepoError kind="error" repo={`${owner}/${name}`} />;
  }

  // Open the entry doc — scoped to a folder when the URL pointed at one.
  const target = findEntryDoc(bundle.tree, folder);
  if (target) redirect(`/read/${owner}/${repo}/${target}`);

  return <RepoError kind="empty" repo={`${owner}/${name}`} />;
}

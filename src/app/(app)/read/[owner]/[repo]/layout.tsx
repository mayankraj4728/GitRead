import { getRepoBundle } from "@/lib/reader";
import { RepoNotFoundError, RateLimitError, TokenRevokedError } from "@/lib/github/client";
import { purgeStaleSession } from "@/lib/purge-stale-session";
import { parseRepoSegment } from "@/lib/github-url";
import { ReaderShell } from "@/components/reader/reader-shell";
import { RepoError } from "@/components/reader/repo-error";

interface Props {
  children: React.ReactNode;
  params: Promise<{ owner: string; repo: string }>;
}

export default async function ReadLayout({ children, params }: Props) {
  const { owner, repo } = await params;
  const { name, ref } = parseRepoSegment(repo);

  let bundle;
  try {
    bundle = await getRepoBundle(owner, name, ref);
  } catch (err) {
    if (err instanceof TokenRevokedError) await purgeStaleSession();
    if (err instanceof RepoNotFoundError) return <RepoError kind="not-found" repo={`${owner}/${name}`} />;
    if (err instanceof RateLimitError) return <RepoError kind="rate-limit" />;
    return <RepoError kind="error" repo={`${owner}/${name}`} />;
  }

  return (
    <ReaderShell
      repo={bundle.repo}
      slug={bundle.slug}
      tree={bundle.tree}
      count={bundle.fileCount}
    >
      {children}
    </ReaderShell>
  );
}

import { redirect } from "next/navigation";
import { FileQuestion } from "lucide-react";
import { getRepoBundle } from "@/lib/reader";

interface Props {
  params: Promise<{ owner: string; repo: string }>;
}

export default async function RepoIndexPage({ params }: Props) {
  const { owner, repo } = await params;
  const bundle = await getRepoBundle(owner, repo);

  if (bundle.entryPath) {
    redirect(`/read/${owner}/${repo}/${bundle.entryPath}`);
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-32 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <FileQuestion className="size-7" />
      </span>
      <h1 className="mt-5 text-xl font-semibold">No documents yet</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This repository doesn&apos;t contain any Markdown files to read.
      </p>
    </div>
  );
}

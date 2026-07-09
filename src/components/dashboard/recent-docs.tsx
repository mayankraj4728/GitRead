import Link from "next/link";
import { FileText } from "lucide-react";
import { fileToTitle, timeAgo } from "@/lib/utils";

interface Doc {
  repoFullName: string;
  filePath: string;
  title: string | null;
  openedAt: string;
}

/** Compact list of recently opened documents. */
export function RecentDocs({ docs }: { docs: Doc[] }) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {docs.map((doc) => (
        <li key={`${doc.repoFullName}/${doc.filePath}`}>
          <Link
            href={`/read/${doc.repoFullName}/${doc.filePath}`}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted"
          >
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {doc.title ?? fileToTitle(doc.filePath)}
              </p>
              <p className="truncate text-xs text-muted-foreground">{doc.repoFullName}</p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(doc.openedAt)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

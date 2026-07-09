import Link from "next/link";

interface Props {
  title: string;
  href?: string;
  action?: string;
}

/** Consistent section header with an optional "see all" link. */
export function SectionHeading({ title, href, action = "See all" }: Props) {
  return (
    <div className="mb-4 flex items-baseline justify-between">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {href && (
        <Link href={href} className="text-sm font-medium text-accent hover:underline">
          {action}
        </Link>
      )}
    </div>
  );
}

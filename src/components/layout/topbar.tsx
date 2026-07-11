"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Search } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { UserMenu } from "./user-menu";
import { useUi } from "@/stores/ui";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Home" },
  { href: "/repos", label: "Library" },
];

interface Props {
  user: { name?: string | null; image?: string | null; login?: string | null };
}

export function Topbar({ user }: Props) {
  const pathname = usePathname();
  const open = useUi((s) => s.open);
  return (
    <header className="zen-hide sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-7 place-items-center rounded-md bg-accent text-accent-foreground">
            <BookOpen className="size-4" />
          </span>
          <span className="hidden sm:inline">GitRead</span>
        </Link>
        <nav className="flex items-center gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => open("palette")}
            className="mr-1 hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground sm:flex"
          >
            <Search className="size-3.5" />
            <span>Search…</span>
            <kbd className="rounded border border-border bg-muted px-1.5 text-xs">⌘K</kbd>
          </button>
          <button
            onClick={() => open("palette")}
            aria-label="Search"
            className="grid size-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:hidden"
          >
            <Search className="size-4" />
          </button>
          <ThemeToggle />
          <UserMenu name={user.name} image={user.image} login={user.login} />
        </div>
      </div>
    </header>
  );
}

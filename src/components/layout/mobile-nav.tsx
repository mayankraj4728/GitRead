"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Home, Library, Search, Moon, Sun } from "lucide-react";
import { useUi } from "@/stores/ui";
import { useReaderNav } from "@/stores/reader-nav";
import { cn } from "@/lib/utils";

/** Native-feeling bottom navigation, mobile only. Hidden in Zen mode. */
export function MobileNav() {
  const pathname = usePathname();
  const openOverlay = useUi((s) => s.open);
  const repoFullName = useReaderNav((s) => s.repoFullName);
  const { resolvedTheme, setTheme } = useTheme();

  const inReader = pathname.startsWith("/read/");

  return (
    <nav className="zen-hide fixed inset-x-0 bottom-0 z-40 flex h-14 items-stretch border-t border-border bg-background/90 backdrop-blur lg:hidden">
      <Item href="/dashboard" active={pathname === "/dashboard"} icon={Home} label="Home" />
      <Item href="/repos" active={pathname.startsWith("/repos")} icon={Library} label="Library" />
      <Button
        onClick={() => openOverlay(inReader && repoFullName ? "search" : "palette")}
        icon={Search}
        label="Search"
      />
      <Button
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        icon={resolvedTheme === "dark" ? Sun : Moon}
        label="Theme"
      />
    </nav>
  );
}

interface ItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

function Item({ href, active, icon: Icon, label }: ItemProps & { href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors",
        active ? "text-accent" : "text-muted-foreground",
      )}
    >
      <Icon className="size-5" />
      {label}
    </Link>
  );
}

function Button({ onClick, icon: Icon, label }: ItemProps & { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] text-muted-foreground transition-colors active:text-accent"
    >
      <Icon className="size-5" />
      {label}
    </button>
  );
}

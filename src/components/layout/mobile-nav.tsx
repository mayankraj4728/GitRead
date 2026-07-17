"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Home, Library, Search, Moon, Sun } from "lucide-react";
import { useUi } from "@/stores/ui";
import { useReaderNav } from "@/stores/reader-nav";
import { cn } from "@/lib/utils";

/**
 * Sun in dark mode, moon in light — but both are always in the HTML and CSS
 * picks one (`dark:` variant). Branching on `resolvedTheme` here would break
 * hydration: the server doesn't know the device theme, so its HTML wouldn't
 * match the first client render.
 */
function ThemeIcon({ className }: { className?: string }) {
  return (
    <span className={cn("relative", className)}>
      <Sun className="absolute inset-0 size-full rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <Moon className="size-full rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
    </span>
  );
}

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
        icon={ThemeIcon}
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

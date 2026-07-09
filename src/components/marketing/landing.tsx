import Link from "next/link";
import { BookOpen, Code2, FileText, Sparkles, GitBranch, Search } from "lucide-react";
import { GitHubButton } from "./github-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const FEATURES = [
  { icon: FileText, title: "Book-like reading", body: "Your Markdown, rendered with editorial typography and calm spacing." },
  { icon: Code2, title: "Gorgeous code", body: "Syntax highlighting, copy, line numbers, filenames — every block polished." },
  { icon: GitBranch, title: "Diagrams & math", body: "Mermaid diagrams and KaTeX equations render automatically." },
  { icon: Search, title: "Effortless nav", body: "A living file tree and on-this-page contents keep you oriented." },
  { icon: Sparkles, title: "Always in sync", body: "Push to GitHub and your library updates — no rebuilds, smart caching." },
  { icon: BookOpen, title: "Made for focus", body: "Themes, reading progress, and a distraction-free layout." },
];

export function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg bg-accent text-accent-foreground">
            <BookOpen className="size-4" />
          </span>
          GitRead
        </div>
        <ThemeToggle />
      </header>

      <section className="mx-auto max-w-3xl px-6 pb-20 pt-16 text-center sm:pt-24">
        <div className="animate-fade-in">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 text-accent" /> Your GitHub notes, reimagined
          </span>
          <h1 className="mt-6 text-balance text-5xl font-semibold tracking-tight sm:text-6xl">
            Read your GitHub notes like a{" "}
            <span className="bg-gradient-to-br from-accent to-accent/60 bg-clip-text text-transparent">
              beautiful book
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-lg text-muted-foreground">
            GitRead turns any repository of Markdown into a premium, distraction-free reading
            experience. GitHub is just the storage — the reading is all yours.
          </p>
          <div className="mt-9 flex items-center justify-center gap-3">
            <GitHubButton size="lg" />
            <Link
              href="#features"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              See features →
            </Link>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 pb-28">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="group rounded-xl border border-border bg-card p-6 transition-colors hover:border-accent/40"
            >
              <span className="grid size-10 place-items-center rounded-lg bg-accent-muted text-accent">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        Built for developers, students, and lifelong learners.
      </footer>
    </div>
  );
}

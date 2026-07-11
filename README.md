<div align="center">

# 📖 GitRead

**Read your GitHub repositories like a beautiful book.**

GitRead turns any GitHub repository — your notes, your docs, an entire course,
or any public repo on the internet — into a premium, distraction-free reading
experience. Think _Medium × Notion × Obsidian Publish_, but the source of truth
is just GitHub.

</div>

---

## What is GitRead?

GitHub is a fantastic place to _store_ Markdown, code, and notes — but a
terrible place to _read_ them. Raw `.md` files, cramped diffs, no typography, no
navigation, no reading flow.

**GitRead fixes that.** Sign in with GitHub, open any repository, and it becomes
a polished digital library: editorial typography, syntax-highlighted code,
rendered diagrams and math, a live file tree, an on-this-page table of contents,
reading progress, search, bookmarks, and light/dark themes. You forget you're
reading files on GitHub at all.

It works for **your own repos (public and private)** _and_ **any public
repository** — just paste a URL.

---

## ✨ Features

### Reading experience

- **Book-quality typography** — comfortable measure, refined type scale, serif or
  sans body, adjustable text size / line-height / width.
- **Gorgeous code blocks** — Shiki syntax highlighting (light/dark), filename +
  language header, one-click copy, line numbers, collapse for long blocks.
- **Diagrams & math** — [Mermaid](https://mermaid.js.org) flowcharts/sequence/ER
  diagrams and [KaTeX](https://katex.org) equations render automatically.
- **Rich Markdown** — GitHub-flavored tables, task lists, footnotes, GitHub
  alerts (`> [!NOTE]`), `:::admonitions`, emoji, and click-to-zoom images.
- **PDF viewer** — open `.pdf` files (lecture notes, slides) inline, no download.
- **Reads _every_ file** — Markdown as prose, source/config/text as
  syntax-highlighted documents, images as previews.

### Navigation & discovery

- **Collapsible file tree** with the path to your current file auto-expanded.
- **On-this-page contents** that highlights your section as you scroll.
- **Reading progress bar** + **scroll-position memory** (pick up where you left off).
- **⌘K command palette** — jump to any file, repo, or command.
- **In-repo search** across titles, headings, filenames, and content, with
  highlighted snippets (cached per-repo index).
- **Breadcrumbs, prev/next document, and keyboard shortcuts** throughout.

### Personalization & library

- **Dashboard** — recent repositories, continue reading, recently read, favorites, bookmarks.
- **Bookmarks** (per document) and **Favorites** (per repository).
- **Zen mode** — hide all chrome for pure, full-width reading.
- **Themes** — light, dark, and system, with smooth transitions.

### Read _any_ public repository

Paste a GitHub URL on the dashboard and start reading instantly. Supported:

```
github.com/vercel/next.js                      → repository
github.com/vercel/next.js/tree/canary/docs     → a folder on a branch
github.com/vercel/next.js/blob/canary/README.md → a specific file
vercel/next.js                                  → shorthand also works
```

The experience is **identical** to reading your own repos — same reader, same
features. Graceful, beautiful error pages handle invalid URLs, private/not-found
repos, rate limits, and empty repositories.

### Always fresh, never wasteful

Content is cached by the repo's current commit SHA. Push to GitHub and GitRead
shows the latest automatically — no rebuilds, no webhooks, and no hammering the
GitHub API.

---

## ⌨️ Keyboard shortcuts

| Key | Action |
| --- | --- |
| `⌘ / Ctrl + K` | Command palette (files · repos · commands) |
| `/` | Search the current repository |
| `t` | Cycle theme (light → dark → system) |
| `z` | Toggle Zen mode |
| `b` | Bookmark the current document |
| `[` / `]` | Previous / next document |
| `?` | Shortcuts help |
| `Esc` | Close overlays |

---

## 🧱 Tech stack

- **Next.js 15** (App Router) · **TypeScript** · **Tailwind CSS v4**
- **Auth.js (NextAuth v5)** with GitHub OAuth · **Octokit**
- **Prisma** + **PostgreSQL** · **Redis** (optional, for GitHub API caching)
- Markdown via **unified / remark / rehype**, **Shiki** (code),
  **KaTeX** (math), **Mermaid** (diagrams)
- **Framer Motion** · **Zustand** · **Lucide**

---

## 🚀 Quick start

### 1. Prerequisites

- Node.js 20+ and npm
- A PostgreSQL database — via Docker (`docker compose up -d`) or a local/hosted one
- _(optional)_ Redis for caching

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:

- `AUTH_SECRET` — generate with `openssl rand -base64 32`
- `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` — from a **GitHub OAuth App**
  (<https://github.com/settings/developers> → _New OAuth App_):
  - **Homepage URL:** `http://localhost:3000`
  - **Authorization callback URL:** `http://localhost:3000/api/auth/callback/github`
- `DATABASE_URL` — matches the docker-compose defaults out of the box
- `REDIS_URL` — optional; leave unset to run without caching

> The `repo` scope is requested so both public **and** private repositories are
> readable.

### 3. Set up the database & run

```bash
docker compose up -d        # start Postgres (+ Redis) — skip if you have your own
npm install
npm run prisma:migrate      # create the schema
npm run dev
```

Open <http://localhost:3000>, sign in with GitHub, open one of your repos or
paste any public repo URL, and start reading.

---

## 🗂️ Project structure

```
src/
  app/
    (app)/                      authenticated shell
      dashboard/                 home: recent, continue reading, favorites, bookmarks
      repos/                     your repository library + "open any URL" bar
      read/[owner]/[repo]/       the 3-pane reading experience
    api/                         auth, progress, bookmarks, favorites, search, raw (PDF proxy)
    actions/                     server actions (auth, open-repo, progress)
  components/
    reader/                      article renderer, code/mermaid/image/pdf, toolbar, TOC
    command/                     ⌘K palette, in-repo search, help, keyboard shortcuts
    navigation/ · repos/ · dashboard/ · layout/ · theme/ · ui/
  lib/
    github/                      Octokit client + repos / tree / content services (+ retry, errors)
    markdown/                    unified pipeline (remark/rehype plugins, Shiki)
    reader.ts                    orchestration — same pipeline for any repo, only the source differs
    github-url.ts                parse repo / branch / folder / file URLs
    search.ts · collections.ts · cache.ts · redis.ts · db.ts · auth.ts
  hooks/ · stores/ · types/
```

**Design principle:** one rendering pipeline for everything. Your repos and any
public repo flow through the exact same services, components, and UI — the only
difference is the data source.

---

## 📜 Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run prisma:migrate` | Create/apply a dev migration |
| `npm run db:up` / `db:down` | Start/stop Postgres + Redis |

---

## 🗺️ Roadmap

| Phase | Status | Highlights |
| --- | --- | --- |
| **1 — Core reading** | ✅ Shipped | Auth, file tree, premium reader, TOC, themes, progress |
| **2 — Navigation & power** | ✅ Shipped | ⌘K palette, search, bookmarks/favorites, reading controls, Zen |
| **+ Read any public repo** | ✅ Shipped | Paste any GitHub URL — repo/branch/folder/file |
| **+ PDF viewer** | ✅ Shipped | Inline PDF reading for public & private repos |
| **3 — Knowledge graph** | 🔜 Planned | `[[wiki links]]`, `#tags`, Obsidian-style graph, backlinks |
| **5 — Product polish** | 🔜 Planned | Webhook sync, virtualized tree, mobile gestures, accessibility |

_(Phase 4 — an AI assistant — is intentionally out of scope.)_

---

<div align="center">

Built with care for **developers, students, and lifelong learners** —
so reading your notes feels as good as writing them.

</div>

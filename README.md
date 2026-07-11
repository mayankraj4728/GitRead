# GitRead

Turn any GitHub repository of Markdown notes into a **premium, book-like reading
experience** — editorial typography, gorgeous code blocks, diagrams, math, a
living file tree, on-this-page contents, reading progress, and light/dark
themes. GitHub is just the storage layer; the reading is all yours.

> **Phase 1 (this build): the core reading experience.** Login → browse repos →
> file tree → beautiful reader → TOC → themes → reading progress. See
> [Roadmap](#roadmap) for what's intentionally deferred.

---

## Tech stack

- **Next.js 15** (App Router) · **TypeScript** · **Tailwind CSS v4**
- **Auth.js (NextAuth v5)** with GitHub OAuth · **Octokit**
- **Prisma** + **PostgreSQL** · **Redis** (optional, for GitHub API caching)
- Markdown via **unified/remark/rehype**, **Shiki** (code), **KaTeX** (math),
  **Mermaid** (diagrams) · **Framer Motion** · **Lucide**

---

## Quick start

### 1. Prerequisites

- Node.js 20+ and npm
- Docker (for local Postgres + Redis), or your own Postgres/Redis

### 2. Start Postgres + Redis

```bash
docker compose up -d
```

### 3. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:

- `AUTH_SECRET` — `openssl rand -base64 32`
- `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` — from a **GitHub OAuth App**
  (<https://github.com/settings/developers> → *New OAuth App*):
  - **Homepage URL:** `http://localhost:3000`
  - **Authorization callback URL:** `http://localhost:3000/api/auth/callback/github`
- `DATABASE_URL` — already matches the docker-compose defaults
- `REDIS_URL` — optional; omit to disable caching (the app still works)

> The `repo` scope is requested so both public **and** private Markdown repos
> are readable.

### 4. Create the database schema

```bash
npm run prisma:migrate      # or: npx prisma migrate dev --name init
```

### 5. Run

```bash
npm run dev
```

Open <http://localhost:3000>, sign in with GitHub, open a repo that contains
`.md` files, and start reading.

---

## How it works

```
src/
  app/
    (app)/                    authenticated shell (dashboard, repos, reader)
      read/[owner]/[repo]/     3-pane reading experience
    actions/                  server actions (auth, reading progress)
    api/auth/[...nextauth]/   Auth.js route
  components/
    reader/                   article renderer, code/mermaid/image enhancers, TOC
    navigation/               file tree, table of contents
    repos/ · dashboard/ · marketing/ · layout/ · theme/ · ui/
  lib/
    github/                   Octokit client + repos/tree/content services
    markdown/                 unified pipeline (remark/rehype plugins, Shiki)
    reader.ts                 orchestration (repo bundle, render a document)
    cache.ts · redis.ts · db.ts · auth.ts
  hooks/ · types/ · stores/
```

**Freshness without wasted API calls.** File content and trees are cached in
Redis keyed by the repo's current commit SHA. Only a short-TTL "what's the HEAD
SHA?" call is made frequently; when you push, the SHA changes, the cache key
changes, and new content is fetched automatically. No webhooks required.

**Reading pipeline.** Markdown is rendered server-side to sanitized HTML
(GFM, GitHub alerts, `:::admonitions`, KaTeX, Shiki dual-theme highlighting,
heading slugs/anchors, relative-image rewriting to `raw.githubusercontent.com`).
The client progressively enhances it: code-block chrome (language badge,
filename, copy, line numbers, expand), Mermaid diagrams, and click-to-zoom
images.

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (runs `prisma generate`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run prisma:migrate` | Create/apply a dev migration |
| `npm run db:up` / `db:down` | Start/stop Postgres + Redis |

---

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `⌘/Ctrl + K` | Command palette (files · repos · commands) |
| `/` | Search the current repository |
| `t` | Cycle theme (light → dark → system) |
| `z` | Toggle Zen mode |
| `b` | Bookmark the current document |
| `[` / `]` | Previous / next document |
| `?` | Shortcuts help |
| `Esc` | Close overlays |

---

## Roadmap

**Phase 1 — Core reading** ✅ · **Phase 2 — Navigation & reading power** ✅

Phase 2 shipped: command palette (`⌘K`), in-repo fuzzy search over
titles/headings/filenames/content (cached per-repo index), bookmarks &
favorites, reading controls (text size, line height, width, serif/sans),
Zen mode, and keyboard shortcuts.

Remaining phases (clean seams already in place):

- **Phase 3 — Knowledge graph:** `[[wiki links]]` · `#tags` · Obsidian-style graph view
- **Phase 5 — Polish:** webhook sync · virtualized tree/prefetch · mobile gestures · a11y

(Phase 4 — AI assistant — is intentionally skipped.)

---

Built for developers, students, and lifelong learners.

import "server-only";
import { codeToHtml } from "shiki";
import type { ShikiTransformer } from "shiki";
import { rawUrl } from "@/lib/github/content.service";
import type { DocPayload } from "@/types";

export type DocKind = "markdown" | "code" | "image" | "pdf" | "binary";

const MARKDOWN_EXTS = new Set(["md", "mdx", "markdown"]);
const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp", "ico", "avif"]);
const BINARY_EXTS = new Set([
  "zip", "tar", "gz", "tgz", "rar", "7z", "exe", "dll", "so", "dylib",
  "bin", "wasm", "woff", "woff2", "ttf", "otf", "eot", "mp4", "mov", "avi",
  "mkv", "webm", "mp3", "wav", "flac", "ogg", "jar", "class", "psd", "sketch",
  "xlsx", "docx", "pptx",
]);

/** Extension → Shiki language id. Unknowns fall back to plain text. */
const EXT_LANG: Record<string, string> = {
  ts: "typescript", tsx: "tsx", js: "javascript", jsx: "jsx", mjs: "javascript",
  cjs: "javascript", json: "json", jsonc: "jsonc", py: "python", java: "java",
  kt: "kotlin", kts: "kotlin", go: "go", rs: "rust", c: "c", h: "c",
  cpp: "cpp", cc: "cpp", cxx: "cpp", hpp: "cpp", cs: "csharp", rb: "ruby",
  php: "php", swift: "swift", dart: "dart", scala: "scala", groovy: "groovy",
  gradle: "groovy", r: "r", lua: "lua", pl: "perl", sh: "bash", bash: "bash",
  zsh: "bash", ps1: "powershell", sql: "sql", html: "html", htm: "html",
  css: "css", scss: "scss", sass: "sass", less: "less", xml: "xml",
  svg: "xml", yaml: "yaml", yml: "yaml", toml: "toml", ini: "ini",
  cfg: "ini", conf: "ini", properties: "properties", graphql: "graphql",
  gql: "graphql", vue: "vue", svelte: "svelte", astro: "astro",
  prisma: "prisma", proto: "proto", diff: "diff", patch: "diff", tf: "hcl",
  hcl: "hcl", dockerfile: "docker", make: "make", mk: "make",
};

const DUAL_THEMES = { light: "github-light", dark: "github-dark" } as const;

function basename(path: string): string {
  return path.split("/").pop() ?? path;
}

/** Classify a file by extension to decide how to render it. */
export function classify(path: string): DocKind {
  const base = basename(path).toLowerCase();
  const ext = base.includes(".") ? (base.split(".").pop() as string) : "";
  if (MARKDOWN_EXTS.has(ext)) return "markdown";
  if (IMAGE_EXTS.has(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (BINARY_EXTS.has(ext)) return "binary";
  return "code";
}

/** Resolve a Shiki language for a file path (handles extensionless names). */
function langForPath(path: string): string {
  const base = basename(path).toLowerCase();
  if (base === "dockerfile") return "docker";
  if (base === "makefile") return "make";
  if (base.startsWith(".env")) return "ini";
  if (base === ".gitignore" || base === ".gitattributes" || base === "license") return "text";
  const ext = base.includes(".") ? (base.split(".").pop() as string) : "";
  return EXT_LANG[ext] ?? "text";
}

/** Stamp the code-block chrome (language + filename) for a whole-file view. */
function fileChrome(filename: string, lang: string): ShikiTransformer {
  return {
    name: "gitread:file-chrome",
    pre(node) {
      node.properties["data-code"] = "";
      // Full-file view: never collapse, always show line numbers.
      node.properties["data-fullfile"] = "";
      if (lang && lang !== "text") node.properties["data-language"] = lang;
      node.properties["data-filename"] = filename;
    },
  };
}

interface Ctx {
  repoFullName: string;
  sha: string;
}

/** Render a source/text file as a syntax-highlighted read-only document. */
export async function renderCodeFile(
  raw: string,
  path: string,
  ctx: Ctx,
): Promise<DocPayload> {
  const filename = basename(path);
  const lang = langForPath(path);
  const opts = { themes: DUAL_THEMES, defaultColor: false as const, transformers: [fileChrome(filename, lang)] };

  let html: string;
  try {
    html = await codeToHtml(raw, { lang, ...opts });
  } catch {
    html = await codeToHtml(raw, { lang: "text", ...opts });
  }

  const lines = raw.split("\n").length;
  return {
    repoFullName: ctx.repoFullName,
    path,
    title: filename,
    html,
    toc: [],
    readingTimeMinutes: Math.max(1, Math.round(lines / 60)),
    wordCount: lines,
    sha: ctx.sha,
  };
}

/** Render an image file as a centered, zoomable figure. */
export function renderImageDoc(path: string, ctx: Ctx): DocPayload {
  const url = rawUrl(ctx.repoFullName, ctx.sha, path);
  const name = basename(path);
  const html = `<figure class="md-figure"><img src="${escapeAttr(url)}" alt="${escapeAttr(name)}" class="md-image" /><figcaption>${escapeHtml(name)}</figcaption></figure>`;
  return {
    repoFullName: ctx.repoFullName,
    path,
    title: name,
    html,
    toc: [],
    readingTimeMinutes: 1,
    wordCount: 0,
    sha: ctx.sha,
  };
}

/**
 * Render a PDF inline via the browser's native viewer. The bytes are streamed
 * through our authenticated /api/raw proxy (works for public + private repos,
 * any size), so the src is pinned to the commit sha.
 */
export function renderPdfDoc(path: string, ctx: Ctx): DocPayload {
  const name = basename(path);
  const src = `/api/raw?repo=${encodeURIComponent(ctx.repoFullName)}&path=${encodeURIComponent(path)}&sha=${ctx.sha}`;
  const gh = `https://github.com/${ctx.repoFullName}/blob/${ctx.sha}/${path}`;
  const html =
    `<div class="pdf-embed">` +
    `<iframe src="${escapeAttr(src)}" title="${escapeAttr(name)}" loading="lazy"></iframe>` +
    `<p class="pdf-fallback">` +
    `<a href="${escapeAttr(src)}" target="_blank" rel="noreferrer">Open in a new tab</a>` +
    ` · <a href="${escapeAttr(gh)}" target="_blank" rel="noreferrer">View on GitHub</a>` +
    `</p></div>`;
  return {
    repoFullName: ctx.repoFullName,
    path,
    title: name,
    html,
    toc: [],
    readingTimeMinutes: 0,
    wordCount: 0,
    sha: ctx.sha,
  };
}

/** Render a graceful placeholder for binary / non-previewable files. */
export function renderBinaryDoc(path: string, ctx: Ctx): DocPayload {
  const name = basename(path);
  const gh = `https://github.com/${ctx.repoFullName}/blob/${ctx.sha}/${path}`;
  const html = `<div class="binary-doc"><p>This file can't be previewed as text.</p><p><a href="${escapeAttr(gh)}" target="_blank" rel="noreferrer">View “${escapeHtml(name)}” on GitHub →</a></p></div>`;
  return {
    repoFullName: ctx.repoFullName,
    path,
    title: name,
    html,
    toc: [],
    readingTimeMinutes: 1,
    wordCount: 0,
    sha: ctx.sha,
  };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}
function escapeAttr(s: string): string {
  return escapeHtml(s);
}

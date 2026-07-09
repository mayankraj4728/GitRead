import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkDirective from "remark-directive";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
import rehypeShiki from "@shikijs/rehype";
import { transformerMetaHighlight, transformerMetaWordHighlight } from "@shikijs/transformers";

import {
  remarkGithubAlerts,
  remarkAdmonitions,
  remarkCodeMeta,
  remarkRewriteAssets,
} from "./remark-plugins";
import { rehypeExtractMermaid, rehypeCollectToc, transformerCodeChrome } from "./rehype-plugins";
import { estimateReading } from "./reading-time";
import { fileToTitle } from "@/lib/utils";
import type { DocPayload, TocItem } from "@/types";

/** Languages Shiki loads up-front; anything else falls back to plain text. */
const LANGS = [
  "text", "bash", "shellscript", "json", "jsonc", "yaml", "toml", "ini",
  "javascript", "typescript", "jsx", "tsx", "java", "kotlin", "python", "go",
  "rust", "c", "cpp", "csharp", "ruby", "php", "sql", "html", "css", "scss",
  "markdown", "xml", "diff", "dockerfile", "graphql", "groovy", "scala",
  "swift", "dart", "r", "lua", "perl", "powershell", "makefile", "nginx",
  "properties", "http", "prisma",
];

// Typed loosely: Shiki's `langs` expects a literal language union, but we pass
// a curated string list and rely on `fallbackLanguage` for anything unknown.
const shikiOptions: Parameters<typeof rehypeShiki>[0] = {
  themes: { light: "github-light", dark: "github-dark" },
  langs: LANGS,
  defaultColor: false,
  fallbackLanguage: "text",
  defaultLanguage: "text",
  addLanguageClass: true,
  transformers: [
    transformerMetaHighlight(),
    transformerMetaWordHighlight(),
    transformerCodeChrome(),
  ],
} as Parameters<typeof rehypeShiki>[0];

interface RenderContext {
  repoFullName: string;
  path: string;
  sha: string;
}

/** Render markdown → sanitized HTML + TOC + reading stats for the reader. */
export async function renderMarkdown(
  markdown: string,
  ctx: RenderContext,
): Promise<DocPayload> {
  const toc: TocItem[] = [];
  const dir = ctx.path.includes("/") ? ctx.path.slice(0, ctx.path.lastIndexOf("/")) : "";

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkDirective)
    .use(remarkAdmonitions)
    .use(remarkGithubAlerts)
    .use(remarkCodeMeta)
    .use(remarkRewriteAssets, { fullName: ctx.repoFullName, sha: ctx.sha, dir })
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeExtractMermaid)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      behavior: "wrap",
      properties: { className: ["heading-anchor"] },
    })
    .use(rehypeKatex)
    .use(rehypeShiki, shikiOptions)
    .use(rehypeCollectToc, toc)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(markdown);

  const { words, minutes } = estimateReading(markdown);
  const title = deriveTitle(markdown) ?? fileToTitle(ctx.path);

  return {
    repoFullName: ctx.repoFullName,
    path: ctx.path,
    title,
    html: String(file),
    toc,
    readingTimeMinutes: minutes,
    wordCount: words,
    sha: ctx.sha,
  };
}

/** Use the first level-1 heading as the document title when present. */
function deriveTitle(markdown: string): string | null {
  const m = /^\s*#\s+(.+?)\s*$/m.exec(markdown);
  return m ? m[1].replace(/[*_`]/g, "").trim() : null;
}

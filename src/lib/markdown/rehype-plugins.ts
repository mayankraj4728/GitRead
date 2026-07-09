import { visit } from "unist-util-visit";
import { toString } from "hast-util-to-string";
import type { Root, Element } from "hast";
import type { ShikiTransformer } from "shiki";
import type { TocItem } from "@/types";

/**
 * Extract ```mermaid fences BEFORE Shiki runs, replacing the `<pre><code>`
 * with a `<div class="mermaid-src" data-chart="…">` the client renders.
 */
export function rehypeExtractMermaid() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element, index, parent: any) => {
      if (node.tagName !== "pre" || !parent || index == null) return;
      const code = node.children.find(
        (c): c is Element => c.type === "element" && c.tagName === "code",
      );
      if (!code) return;
      const classes = (code.properties?.className as string[] | undefined) ?? [];
      if (!classes.includes("language-mermaid")) return;

      parent.children[index] = {
        type: "element",
        tagName: "div",
        properties: { className: ["mermaid-src"], "data-chart": toString(code) },
        children: [],
      } satisfies Element;
    });
  };
}

/**
 * Collect heading ids/text/depth (h2–h4) into `sink` for the on-this-page TOC.
 * Runs after rehype-slug so ids match the actual anchors.
 */
export function rehypeCollectToc(sink: TocItem[]) {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      const m = /^h([1-6])$/.exec(node.tagName);
      if (!m) return;
      const depth = Number(m[1]);
      if (depth < 2 || depth > 4) return;
      const id = node.properties?.id as string | undefined;
      if (!id) return;
      const text = toString(node).trim();
      if (text) sink.push({ id, text, depth });
    });
  };
}

/**
 * Shiki transformer that stamps `data-language` and `data-filename` (from the
 * fence meta) onto the `<pre>` so the client can render the code-block chrome.
 */
export function transformerCodeChrome(): ShikiTransformer {
  return {
    name: "gitread:code-chrome",
    pre(node) {
      const lang = this.options.lang;
      if (lang && lang !== "text") node.properties["data-language"] = lang;
      const meta = this.options.meta as { __raw?: string } | undefined;
      const raw = meta?.__raw ?? "";
      const title = /(?:title|filename)="([^"]+)"/.exec(raw)?.[1];
      if (title) node.properties["data-filename"] = title;
      node.properties["data-code"] = "";
    },
  };
}

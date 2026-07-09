import { visit } from "unist-util-visit";
import type { Root } from "mdast";

/** GitHub alert types → human label. */
const ALERT_LABELS: Record<string, string> = {
  note: "Note",
  tip: "Tip",
  important: "Important",
  warning: "Warning",
  caution: "Caution",
};

const ALERT_RE = /^\s*\[!(\w+)\]\s*\n?/;

/**
 * Transform GitHub alert blockquotes:
 *   > [!NOTE]
 *   > text
 * into a styled `<div class="gh-alert gh-alert-note">` with a title row.
 */
export function remarkGithubAlerts() {
  return (tree: Root) => {
    visit(tree, "blockquote", (node: any) => {
      const firstPara = node.children?.[0];
      if (!firstPara || firstPara.type !== "paragraph") return;
      const firstText = firstPara.children?.[0];
      if (!firstText || firstText.type !== "text") return;

      const match = ALERT_RE.exec(firstText.value);
      if (!match) return;
      const type = match[1].toLowerCase();
      if (!ALERT_LABELS[type]) return;

      // Strip the "[!NOTE]" marker from the leading text node.
      firstText.value = firstText.value.slice(match[0].length).replace(/^\n+/, "");
      if (firstText.value === "") firstPara.children.shift();
      if (firstPara.children.length === 0) node.children.shift();

      node.data = {
        ...(node.data ?? {}),
        hName: "div",
        hProperties: {
          className: ["gh-alert", `gh-alert-${type}`],
          "data-alert": type,
        },
      };
      // Prepend the title row.
      node.children.unshift({
        type: "paragraph",
        data: { hProperties: { className: ["gh-alert-title"] } },
        children: [{ type: "text", value: ALERT_LABELS[type] }],
      });
    });
  };
}

/**
 * Convert remark-directive containers (`:::note`, `:::tip`, …) into styled
 * admonition blocks, mirroring the GitHub alert look.
 */
export function remarkAdmonitions() {
  return (tree: Root) => {
    visit(tree, (node: any) => {
      if (
        node.type !== "containerDirective" &&
        node.type !== "leafDirective" &&
        node.type !== "textDirective"
      ) {
        return;
      }
      const name = node.name?.toLowerCase();
      if (!name || !ALERT_LABELS[name]) return;
      const label = (node.attributes?.title as string) || ALERT_LABELS[name];

      node.data = {
        ...(node.data ?? {}),
        hName: "div",
        hProperties: {
          className: ["gh-alert", `gh-alert-${name}`],
          "data-alert": name,
        },
      };
      node.children.unshift({
        type: "paragraph",
        data: { hProperties: { className: ["gh-alert-title"] } },
        children: [{ type: "text", value: label }],
      });
    });
  };
}

/**
 * Preserve the code-fence meta string (e.g. `title="a.ts" {1,3}`) onto the
 * generated `<code>` element so Shiki transformers can read it.
 */
export function remarkCodeMeta() {
  return (tree: Root) => {
    visit(tree, "code", (node: any) => {
      node.data = node.data ?? {};
      node.data.hProperties = {
        ...(node.data.hProperties ?? {}),
        metastring: node.meta ?? "",
      };
    });
  };
}

/**
 * Rewrite relative image sources (and relative anchor hrefs to assets) so they
 * resolve against raw.githubusercontent.com at the pinned commit sha.
 */
export function remarkRewriteAssets(opts: { fullName: string; sha: string; dir: string }) {
  const base = `https://raw.githubusercontent.com/${opts.fullName}/${opts.sha}/`;
  const resolve = (src: string): string => {
    if (/^(https?:)?\/\//i.test(src) || src.startsWith("data:") || src.startsWith("#")) {
      return src;
    }
    // Resolve "./" and "../" against the current file's directory.
    const path = new URL(src, `file:///${opts.dir ? opts.dir + "/" : ""}`).pathname.replace(
      /^\/+/,
      "",
    );
    return base + path;
  };

  return (tree: Root) => {
    visit(tree, "image", (node: any) => {
      if (typeof node.url === "string") node.url = resolve(node.url);
    });
    visit(tree, "html", (node: any) => {
      if (typeof node.value === "string") {
        node.value = node.value.replace(
          /(<img[^>]+src=)(["'])(.*?)\2/gi,
          (_m: string, p1: string, q: string, url: string) => `${p1}${q}${resolve(url)}${q}`,
        );
      }
    });
  };
}

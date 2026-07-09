/**
 * Progressive enhancement for server-rendered markdown HTML: code-block chrome,
 * Mermaid diagrams, and click-to-zoom images. Runs against a live DOM subtree.
 */

const COPY_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
const CHECK_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><path d="M20 6 9 17l-5-5"/></svg>`;

const COLLAPSE_THRESHOLD = 460; // px — taller blocks get a show-more toggle.

/** Add header bar (language, filename, copy) + line numbers + expand to code. */
export function enhanceCodeBlocks(root: HTMLElement): void {
  const blocks = root.querySelectorAll<HTMLPreElement>("pre[data-code]");
  blocks.forEach((pre) => {
    if (pre.dataset.enhanced) return;
    pre.dataset.enhanced = "1";

    const language = pre.getAttribute("data-language") ?? "";
    const filename = pre.getAttribute("data-filename") ?? "";

    const wrapper = document.createElement("figure");
    wrapper.className = "code-block group not-prose";
    pre.parentNode?.insertBefore(wrapper, pre);

    // Header
    const header = document.createElement("div");
    header.className = "code-block-header";
    header.innerHTML = `
      <div class="code-block-meta">
        <span class="code-dot" data-c="r"></span><span class="code-dot" data-c="y"></span><span class="code-dot" data-c="g"></span>
        ${filename ? `<span class="code-filename">${escapeHtml(filename)}</span>` : ""}
      </div>
      <div class="code-block-actions">
        ${language ? `<span class="code-lang">${escapeHtml(language)}</span>` : ""}
      </div>`;

    const copyBtn = document.createElement("button");
    copyBtn.className = "code-copy";
    copyBtn.type = "button";
    copyBtn.setAttribute("aria-label", "Copy code");
    copyBtn.innerHTML = COPY_ICON;
    copyBtn.addEventListener("click", () => {
      const text = pre.querySelector("code")?.textContent ?? pre.textContent ?? "";
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.innerHTML = CHECK_ICON;
        copyBtn.classList.add("copied");
        setTimeout(() => {
          copyBtn.innerHTML = COPY_ICON;
          copyBtn.classList.remove("copied");
        }, 1600);
      });
    });
    header.querySelector(".code-block-actions")?.appendChild(copyBtn);

    wrapper.appendChild(header);
    wrapper.appendChild(pre);
    pre.classList.add("with-line-numbers");

    // Expand / collapse tall blocks.
    if (pre.scrollHeight > COLLAPSE_THRESHOLD) {
      wrapper.classList.add("is-collapsed");
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "code-expand";
      toggle.textContent = "Show more";
      toggle.addEventListener("click", () => {
        const collapsed = wrapper.classList.toggle("is-collapsed");
        toggle.textContent = collapsed ? "Show more" : "Show less";
      });
      wrapper.appendChild(toggle);
    }
  });
}

/** Wrap images in figures with captions and wire click-to-zoom. */
export function enhanceImages(root: HTMLElement, onZoom: (src: string, alt: string) => void): void {
  const imgs = root.querySelectorAll<HTMLImageElement>("img");
  imgs.forEach((img) => {
    if (img.dataset.enhanced || img.closest(".mermaid-src")) return;
    img.dataset.enhanced = "1";
    img.loading = "lazy";
    img.classList.add("md-image");
    img.addEventListener("click", () => onZoom(img.currentSrc || img.src, img.alt));

    const alt = img.getAttribute("alt");
    if (alt && !img.closest("figure")) {
      const figure = document.createElement("figure");
      figure.className = "md-figure";
      img.parentNode?.insertBefore(figure, img);
      figure.appendChild(img);
      const cap = document.createElement("figcaption");
      cap.textContent = alt;
      figure.appendChild(cap);
    }
  });
}

/** Render all Mermaid sources found in the subtree. */
export async function renderMermaid(root: HTMLElement, isDark: boolean): Promise<void> {
  const nodes = root.querySelectorAll<HTMLElement>(".mermaid-src");
  if (nodes.length === 0) return;

  const mermaid = (await import("mermaid")).default;
  mermaid.initialize({
    startOnLoad: false,
    theme: isDark ? "dark" : "neutral",
    securityLevel: "strict",
    fontFamily: "var(--font-body)",
  });

  let i = 0;
  for (const node of Array.from(nodes)) {
    const chart = node.getAttribute("data-chart");
    if (!chart) continue;
    try {
      const { svg } = await mermaid.render(`mmd-${Date.now()}-${i++}`, chart);
      node.innerHTML = svg;
      node.classList.add("mermaid-rendered");
    } catch {
      node.innerHTML = `<pre class="mermaid-error">Failed to render diagram.</pre>`;
    }
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[c];
  });
}

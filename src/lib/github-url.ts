/**
 * Parse GitHub repository URLs (and `owner/repo` shorthand) into a normalized
 * target, and encode a branch ref into a single URL segment.
 *
 * The ref is encoded as `name~ref`. This is unambiguous because `~` is illegal
 * in Git ref names AND in GitHub repository names, so it can never collide.
 */

export type RepoUrlKind = "repo" | "tree" | "blob";

export interface ParsedRepoUrl {
  owner: string;
  name: string;
  ref?: string;
  path?: string;
  kind: RepoUrlKind;
}

const NAME_RE = /^[A-Za-z0-9._-]+$/;
export const REF_SEP = "~";

/** Parse a GitHub URL or `owner/repo` shorthand. Returns null if unrecognized. */
export function parseGitHubUrl(input: string): ParsedRepoUrl | null {
  const raw = input.trim();
  if (!raw) return null;

  // A full URL to a non-GitHub host is not supported.
  if (/^[a-z]+:\/\//i.test(raw) && !/(^|\/\/)(www\.)?github\.com\//i.test(raw)) {
    return null;
  }

  let rest = raw
    .replace(/^[a-z]+:\/\//i, "")
    .replace(/^(www\.)?github\.com\//i, "")
    .split(/[?#]/)[0]
    .replace(/\/+$/, "");

  const segments = rest.split("/").filter(Boolean);
  if (segments.length < 2) return null;

  const owner = segments[0];
  const name = segments[1].replace(/\.git$/i, "");
  if (!NAME_RE.test(owner) || !NAME_RE.test(name)) return null;

  if (segments.length === 2) return { owner, name, kind: "repo" };

  const marker = segments[2];
  if (marker === "tree" || marker === "blob") {
    const ref = segments[3];
    if (!ref) return { owner, name, kind: "repo" };
    const path = segments.slice(4).join("/") || undefined;
    // NOTE: multi-segment refs (branch names with "/") are resolved best-effort
    // by taking the first segment as the ref.
    return { owner, name, ref, path, kind: marker === "blob" ? "blob" : "tree" };
  }

  // Other GitHub paths (/issues, /pulls, …) → treat as the repository root.
  return { owner, name, kind: "repo" };
}

/** Encode a `[repo]` route segment, appending `~ref` only for a non-default branch. */
export function repoSegment(name: string, ref?: string | null, defaultBranch?: string): string {
  const useRef = ref && ref !== defaultBranch ? ref : undefined;
  return useRef ? `${name}${REF_SEP}${useRef}` : name;
}

/** App-level repo identifier ("owner/name" or "owner/name~ref"). */
export function repoSlug(
  owner: string,
  name: string,
  ref?: string | null,
  defaultBranch?: string,
): string {
  return `${owner}/${repoSegment(name, ref, defaultBranch)}`;
}

/** Split a `[repo]` route segment back into name + optional ref. */
export function parseRepoSegment(segment: string): { name: string; ref?: string } {
  const i = segment.indexOf(REF_SEP);
  if (i === -1) return { name: segment };
  return { name: segment.slice(0, i), ref: segment.slice(i + 1) || undefined };
}

/** Build the reader destination for a parsed URL. */
export function readerDestination(p: ParsedRepoUrl): string {
  const seg = p.ref ? `${p.name}${REF_SEP}${p.ref}` : p.name;
  const base = `/read/${p.owner}/${seg}`;
  if (p.kind === "blob" && p.path) return `${base}/${p.path}`;
  if (p.kind === "tree" && p.path) return `${base}?in=${encodeURIComponent(p.path)}`;
  return base;
}

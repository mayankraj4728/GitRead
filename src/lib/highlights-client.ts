/** Client fetch helpers for text highlights (see /api/highlights). */

import type { HighlightColor, HighlightInfo } from "@/types";

export interface NewHighlight {
  repoFullName: string;
  filePath: string;
  text: string;
  prefix: string;
  suffix: string;
  occurrence: number;
  color: HighlightColor;
  sha: string;
}

export async function createHighlight(input: NewHighlight): Promise<HighlightInfo> {
  const res = await fetch("/api/highlights", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to save highlight");
  const data = (await res.json()) as { highlight: HighlightInfo };
  return data.highlight;
}

export async function recolorHighlight(id: string, color: HighlightColor): Promise<void> {
  const res = await fetch("/api/highlights", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id, color }),
  });
  if (!res.ok) throw new Error("Failed to update highlight");
}

export async function deleteHighlight(id: string): Promise<void> {
  const res = await fetch("/api/highlights", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error("Failed to remove highlight");
}

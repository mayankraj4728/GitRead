export interface ProgressPayload {
  type: "open" | "progress";
  repoFullName: string;
  filePath: string;
  title: string;
  scrollPct?: number;
  headingId?: string | null;
}

/**
 * Fire-and-forget progress write to the API route. `keepalive` lets it complete
 * even if the page is unloading. Does NOT trigger a route re-render (unlike a
 * Server Action), which keeps scrolling smooth on large documents.
 */
export function postProgress(data: ProgressPayload): void {
  try {
    void fetch("/api/progress", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

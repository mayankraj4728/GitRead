"use server";

import { redirect } from "next/navigation";
import { parseGitHubUrl, readerDestination } from "@/lib/github-url";

export interface OpenRepoState {
  error?: string;
}

/**
 * Parse a pasted GitHub URL (or `owner/repo`) and redirect into the reader.
 * Returns a validation error for unrecognized input (repo existence is checked
 * downstream by the reader, which renders a beautiful error page).
 */
export async function openRepo(
  _prev: OpenRepoState,
  formData: FormData,
): Promise<OpenRepoState> {
  const input = String(formData.get("url") ?? "");
  const parsed = parseGitHubUrl(input);
  if (!parsed) {
    return {
      error: "Enter a GitHub repository URL, e.g. https://github.com/vercel/next.js",
    };
  }
  redirect(readerDestination(parsed));
}

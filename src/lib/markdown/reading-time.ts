const WORDS_PER_MINUTE = 220;

/** Estimate word count + reading time from raw markdown. */
export function estimateReading(markdown: string): { words: number; minutes: number } {
  // Drop fenced code blocks and inline code so estimates track prose.
  const prose = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/[#>*_~\-]+/g, " ");
  const words = prose.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE));
  return { words, minutes };
}

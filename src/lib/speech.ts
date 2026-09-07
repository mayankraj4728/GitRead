/**
 * Text-to-speech engine for the reader, built on the free, built-in Web Speech
 * API (`window.speechSynthesis`). No API keys, no server, no network cost — the
 * voices come from the user's browser.
 *
 * We deliberately expose only two voices (see `VOICE_OPTIONS`). Both are the
 * Google remote voices that ship with Chrome/Chromium; on browsers that lack
 * them we fall back to any voice of the same language, then to `null` (which
 * lets the platform pick its default). Callers should check `speechSupported()`
 * before showing any UI.
 *
 * Pure/browser-guarded helpers only — playback state lives in the speech store.
 */

/** A selectable voice, matched against `SpeechSynthesisVoice.name` at runtime. */
export interface VoiceOption {
  key: VoiceKey;
  /** Short label for the UI. */
  label: string;
  /** Longer description for tooltips / menus. */
  description: string;
  /** Exact `voice.name` to prefer (Chrome's Google voices). */
  voiceName: string;
  /** BCP-47 language used both as a fallback filter and as the utterance lang. */
  lang: string;
  /** Lowercased name substrings to match, in priority order, when the exact
   * name isn't present (voice names vary across Chrome versions / platforms). */
  match: readonly string[];
}

export const VOICE_OPTIONS = [
  {
    key: "uk-female",
    label: "UK English",
    description: "Google UK English Female",
    voiceName: "Google UK English Female",
    lang: "en-GB",
    match: ["google uk english female", "uk english female", "en-gb", "english (united kingdom)"],
  },
  {
    key: "us",
    label: "US English",
    description: "Google US English",
    voiceName: "Google US English",
    lang: "en-US",
    match: ["google us english", "us english", "en-us", "english (united states)"],
  },
] as const satisfies readonly VoiceOption[];

export type VoiceKey = "uk-female" | "us";

export const DEFAULT_VOICE: VoiceKey = "uk-female";

/** Playback rate bounds, matching the UI slider. `1` is the natural rate. */
export const RATE_MIN = 0.5;
export const RATE_MAX = 2;
export const RATE_STEP = 0.1;

/** True when the browser can synthesize speech at all. */
export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Resolve the list of available voices, waiting for the async `voiceschanged`
 * event that Chrome fires on first load (its initial `getVoices()` is empty).
 * Resolves with `[]` when speech is unsupported or no voices ever arrive.
 */
export function loadVoices(timeoutMs = 2000): Promise<SpeechSynthesisVoice[]> {
  if (!speechSupported()) return Promise.resolve([]);
  const synth = window.speechSynthesis;
  const existing = synth.getVoices();
  if (existing.length > 0) return Promise.resolve(existing);

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      synth.removeEventListener("voiceschanged", onChange);
      clearTimeout(timer);
      resolve(synth.getVoices());
    };
    const onChange = () => finish();
    synth.addEventListener("voiceschanged", onChange);
    // Fallback: some browsers never fire the event but do populate the list.
    const timer = setTimeout(finish, timeoutMs);
  });
}

/**
 * Pick the best `SpeechSynthesisVoice` for a voice key. Matching, in order:
 * exact name → priority name-substring → same language → same language base →
 * first available. Only returns `null` when `voices` is empty. Never leaving
 * the utterance's `voice` unset is important: an unset voice makes the browser
 * fall back to its default (often the wrong region), which is exactly the bug
 * where every selection sounded like UK English.
 */
export function resolveVoice(
  voices: SpeechSynthesisVoice[],
  key: VoiceKey,
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  const opt = VOICE_OPTIONS.find((v) => v.key === key) ?? VOICE_OPTIONS[0];
  const name = (v: SpeechSynthesisVoice) => v.name.toLowerCase();
  const lang = (v: SpeechSynthesisVoice) => (v.lang ?? "").toLowerCase();

  // 1. Exact voice name (case-insensitive).
  const exact = voices.find((v) => name(v) === opt.voiceName.toLowerCase());
  if (exact) return exact;

  // 2. Name contains a known substring, honoring priority order.
  for (const term of opt.match) {
    const hit = voices.find((v) => name(v).includes(term) || lang(v) === term);
    if (hit) return hit;
  }

  // 3. Same full language tag (e.g. en-US).
  const sameLang = voices.find((v) => lang(v) === opt.lang.toLowerCase());
  if (sameLang) return sameLang;

  // 4. Same base language (any en-*), then anything — never null here.
  const base = opt.lang.slice(0, 2).toLowerCase();
  return voices.find((v) => lang(v).startsWith(base)) ?? voices[0];
}

/**
 * Characters the synthesizer would otherwise announce by name — "right pointing
 * arrow", "sparkles", etc. Covers emoji (pictographic), arrows, dingbats, and
 * misc. technical/symbol blocks, plus the emoji variation selector and ZWJ.
 * Meaningful punctuation (+ = − — < > $ %) is deliberately NOT stripped.
 */
const NON_SPEAKABLE = new RegExp(
  "\\p{Extended_Pictographic}" + // emoji / pictographs (any plane)
    "|[" +
    "\\u2190-\\u21FF" + // arrows  (→ ← ⇒ …)
    "\\u2300-\\u23FF" + // misc technical (⌘ ⏸ ⌫ …)
    "\\u2600-\\u26FF" + // misc symbols (☀ ♻ …)
    "\\u2700-\\u27BF" + // dingbats (✂ ✅ ➡ …)
    "\\u2900-\\u297F" + // supplemental arrows-B
    "\\u2B00-\\u2BFF" + // misc symbols & arrows (⬆ ⭐ …)
    "\\uFE0F" + // emoji variation selector
    "\\u200D" + // zero-width joiner
    "]" +
    "|[\\u{1F000}-\\u{1FAFF}]", // emoji supplementary planes
  "gu",
);

/** Remove emoji / arrows / symbols so they aren't read aloud by name. */
export function stripNonSpeakable(text: string): string {
  return text.replace(NON_SPEAKABLE, " ");
}

/**
 * Split prose into speakable chunks. Chrome silently truncates long utterances
 * (the well-known ~15-second / ~200-char cutoff), so we break on sentence
 * boundaries and then hard-wrap anything still too long. Whitespace is
 * collapsed so the synthesizer doesn't pause on markdown's soft wraps, and
 * emoji / arrows are stripped so they aren't announced by name.
 */
export function chunkText(input: string, maxLen = 200): string[] {
  const text = stripNonSpeakable(input).replace(/\s+/g, " ").trim();
  if (!text) return [];

  // Split after sentence-ending punctuation followed by a space.
  const sentences = text.match(/[^.!?]+[.!?]+(?:["')\]]+)?|\S[^.!?]*$/g) ?? [text];

  const chunks: string[] = [];
  let buf = "";
  const flush = () => {
    const t = buf.trim();
    if (t) chunks.push(t);
    buf = "";
  };

  for (const sentence of sentences) {
    const s = sentence.trim();
    if (!s) continue;
    if (s.length > maxLen) {
      // Sentence itself too long — flush the buffer, then hard-wrap on words.
      flush();
      let line = "";
      for (const word of s.split(" ")) {
        if (line.length + word.length + 1 > maxLen) {
          if (line) chunks.push(line);
          line = word;
        } else {
          line = line ? `${line} ${word}` : word;
        }
      }
      if (line) chunks.push(line);
    } else if (buf.length + s.length + 1 > maxLen) {
      flush();
      buf = s;
    } else {
      buf = buf ? `${buf} ${s}` : s;
    }
  }
  flush();
  return chunks;
}

/** Block-level elements whose text we read aloud (in document order). */
export const READABLE_BLOCKS =
  "p, li, h1, h2, h3, h4, h5, h6, blockquote, figcaption, td, th, dd, dt";

/** Regions we never read (code, diagrams, PDF embeds break as speech). */
const NON_READABLE = "pre, .mermaid, .mermaid-src, .code-block-header, .pdf-embed";

/**
 * Collect readable block elements from the article root, in document order,
 * skipping code/diagram regions and blocks nested inside another readable
 * block (e.g. a `<p>` inside a `<blockquote>` — we keep the innermost).
 */
export function readableBlocks(root: HTMLElement): HTMLElement[] {
  const all = Array.from(root.querySelectorAll<HTMLElement>(READABLE_BLOCKS));
  return all.filter((el) => {
    if (el.closest(NON_READABLE)) return false;
    if (!el.textContent?.trim()) return false;
    // Skip a block that contains another readable block (avoid double-reading).
    if (el.querySelector(READABLE_BLOCKS)) return false;
    return true;
  });
}

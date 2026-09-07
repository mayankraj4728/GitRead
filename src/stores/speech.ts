"use client";

import { create } from "zustand";
import { useReaderPrefs } from "@/stores/reader-prefs";
import {
  chunkText,
  loadVoices,
  READABLE_BLOCKS,
  readableBlocks,
  resolveVoice,
  speechSupported,
  VOICE_OPTIONS,
} from "@/lib/speech";

/** One spoken unit: a snippet of text and the block it belongs to (if any). */
export interface SpeechChunk {
  text: string;
  /** Block element to highlight + scroll to while speaking; null for selections. */
  el: HTMLElement | null;
  /** Logical group id; a gap (breath) is inserted whenever it changes. */
  group: string;
}

export type SpeechStatus = "idle" | "speaking" | "paused";

interface SpeechState {
  status: SpeechStatus;
  /** What is currently being read, for the playback bar label. */
  source: "selection" | "document" | null;
  index: number;
  total: number;
  speakChunks: (chunks: SpeechChunk[], source: "selection" | "document") => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

/** Module-scoped so the utterance isn't garbage-collected mid-speech (a known
 * Chrome bug where `onend`/`onboundary` silently stop firing). */
let chunks: SpeechChunk[] = [];
let utterance: SpeechSynthesisUtterance | null = null;
let voices: SpeechSynthesisVoice[] = [];
/** Bumped on every stop()/new session so stale utterance callbacks are ignored. */
let session = 0;
/** The block currently marked `.reader-speaking`. */
let activeEl: HTMLElement | null = null;
/** Pending inter-block silence timer (the "breath" between points). */
let gapTimer: ReturnType<typeof setTimeout> | null = null;
/** True when the user paused *during* an inter-block gap (nothing was speaking). */
let pausedGap = false;

const CLASS = "reader-speaking";

function clearGap() {
  if (gapTimer !== null) {
    clearTimeout(gapTimer);
    gapTimer = null;
  }
}

/**
 * Silence (ms) to insert before a block so items don't run together — a longer
 * breath between list items than between ordinary blocks. Scaled by the speech
 * rate so pauses shrink when sped up and lengthen when slowed down.
 */
function blockGap(el: HTMLElement | null): number {
  const isListItem = el?.tagName === "LI" || !!el?.closest?.("li");
  const base = isListItem ? 450 : 200;
  const rate = useReaderPrefs.getState().speechRate || 1;
  return Math.round(base / rate);
}

function clearActive() {
  if (activeEl) {
    activeEl.classList.remove(CLASS);
    activeEl = null;
  }
}

/** Move the visual "now reading" marker to a block and bring it into view. */
function highlightBlock(el: HTMLElement | null) {
  if (el === activeEl) return;
  clearActive();
  if (el) {
    el.classList.add(CLASS);
    activeEl = el;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
  }
}

export const useSpeech = create<SpeechState>((set, get) => {
  /** Speak the chunk at `index`, chaining to the next on completion. */
  function speakAt(index: number, mySession: number) {
    if (mySession !== session) return;
    if (index >= chunks.length) {
      finish();
      return;
    }
    const chunk = chunks[index];
    set({ index });
    highlightBlock(chunk.el);

    const { voice, speechRate } = useReaderPrefs.getState();
    const opt = VOICE_OPTIONS.find((v) => v.key === voice) ?? VOICE_OPTIONS[0];
    const u = new SpeechSynthesisUtterance(chunk.text);
    // Prefer a freshly-fetched list — voices can finish loading between the
    // session start and this chunk. Fall back to the cached snapshot.
    const live = window.speechSynthesis.getVoices();
    const resolved = resolveVoice(live.length ? live : voices, voice);
    if (resolved) u.voice = resolved;
    u.lang = resolved?.lang ?? opt.lang;
    u.rate = speechRate;
    u.onend = () => {
      if (mySession !== session) return;
      const next = index + 1;
      if (next >= chunks.length) {
        finish();
        return;
      }
      // Insert a short silence when moving to a new group (block or selection
      // segment) so points/paragraphs don't run together; speak immediately
      // within the same group.
      const gap = chunks[next].group !== chunk.group ? blockGap(chunks[next].el) : 0;
      if (gap > 0) {
        gapTimer = setTimeout(() => {
          gapTimer = null;
          speakAt(next, mySession);
        }, gap);
      } else {
        speakAt(next, mySession);
      }
    };
    u.onerror = () => {
      if (mySession !== session) return;
      // "interrupted"/"canceled" are expected on stop; anything else ends it.
      finish();
    };
    utterance = u;
    window.speechSynthesis.speak(u);
  }

  function finish() {
    clearGap();
    pausedGap = false;
    clearActive();
    chunks = [];
    utterance = null;
    set({ status: "idle", source: null, index: 0, total: 0 });
  }

  return {
    status: "idle",
    source: null,
    index: 0,
    total: 0,

    speakChunks: (next, source) => {
      if (!speechSupported() || next.length === 0) return;
      const synth = window.speechSynthesis;
      // Bump the session BEFORE cancelling so any end/error events from the
      // outgoing utterance are ignored (their captured session is now stale).
      session++;
      clearGap();
      pausedGap = false;
      const mySession = session;
      synth.cancel(); // drop any queued/active utterances first
      chunks = next;
      clearActive();
      set({ status: "speaking", source, index: 0, total: next.length });
      // Voices load lazily in Chrome; wait for them so the first chunk uses the
      // chosen voice rather than the platform default.
      loadVoices().then((v) => {
        if (mySession !== session) return;
        voices = v;
        speakAt(0, mySession);
      });
    },

    pause: () => {
      if (get().status !== "speaking") return;
      if (gapTimer !== null) {
        // Paused mid-breath (nothing is speaking): cancel the pending next
        // chunk and remember to continue from it on resume.
        clearGap();
        pausedGap = true;
      } else {
        window.speechSynthesis.pause();
      }
      set({ status: "paused" });
    },

    resume: () => {
      if (get().status !== "paused") return;
      set({ status: "speaking" });
      if (pausedGap) {
        pausedGap = false;
        speakAt(get().index + 1, session);
      } else {
        window.speechSynthesis.resume();
      }
    },

    stop: () => {
      session++; // invalidate in-flight callbacks
      clearGap();
      pausedGap = false;
      if (speechSupported()) window.speechSynthesis.cancel();
      finish();
    },
  };
});

// ── Imperative entry points (used from the selection menu + toolbar) ─────────

/** Read an ad-hoc string. Splits on blank lines / newlines so multi-paragraph
 * or multi-point selections still breathe between segments. */
export function readSelection(text: string) {
  const segments = text.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  const chunks: SpeechChunk[] = [];
  segments.forEach((seg, gi) => {
    for (const t of chunkText(seg)) chunks.push({ text: t, el: null, group: `s${gi}` });
  });
  useSpeech.getState().speakChunks(chunks, "selection");
}

/**
 * Read the current selection, block-aware: when it spans multiple blocks
 * (paragraphs, list items) we split it back into those blocks so the same
 * inter-block breaths apply — and list items still get the longer pause.
 * Falls back to plain-text reading for single-block / inline selections.
 */
export function readSelectionRange(root: HTMLElement, range: Range) {
  const blocks = readableBlocks(root).filter((b) => rangeIntersects(range, b));
  if (blocks.length <= 1) {
    readSelection(range.toString());
    return;
  }
  const chunks: SpeechChunk[] = [];
  blocks.forEach((el, gi) => {
    for (const t of chunkText(selectedTextIn(range, el))) {
      chunks.push({ text: t, el, group: `b${gi}` });
    }
  });
  if (chunks.length === 0) {
    readSelection(range.toString());
    return;
  }
  useSpeech.getState().speakChunks(chunks, "selection");
}

/** True when `range` overlaps `node` at all. */
function rangeIntersects(range: Range, node: Node): boolean {
  try {
    return range.intersectsNode(node);
  } catch {
    return false;
  }
}

/** The portion of `block`'s text that falls within `range` (the intersection). */
function selectedTextIn(range: Range, block: HTMLElement): string {
  try {
    const r = range.cloneRange();
    const b = document.createRange();
    b.selectNodeContents(block);
    if (r.compareBoundaryPoints(Range.START_TO_START, b) < 0) {
      r.setStart(b.startContainer, b.startOffset);
    }
    if (r.compareBoundaryPoints(Range.END_TO_END, b) > 0) {
      r.setEnd(b.endContainer, b.endOffset);
    }
    return r.toString();
  } catch {
    return block.textContent ?? "";
  }
}

/** Read every readable block in the article, top to bottom. */
export function readDocument(root: HTMLElement) {
  useSpeech.getState().speakChunks(blocksToChunks(readableBlocks(root)), "document");
}

/**
 * Read the document starting from the block containing `node` (e.g. the start
 * of the user's selection) through to the end — "read from here".
 */
export function readFrom(root: HTMLElement, node: Node) {
  const blocks = readableBlocks(root);
  const startEl =
    node instanceof Element
      ? node.closest<HTMLElement>(READABLE_BLOCKS)
      : node.parentElement?.closest<HTMLElement>(READABLE_BLOCKS);
  let from = startEl ? blocks.indexOf(startEl) : 0;
  if (from < 0) {
    // Selection block wasn't itself readable; start at the first block after it.
    from = startEl
      ? blocks.findIndex(
          (b) => startEl.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING,
        )
      : 0;
    if (from < 0) from = 0;
  }
  useSpeech.getState().speakChunks(blocksToChunks(blocks.slice(from)), "document");
}

function blocksToChunks(blocks: HTMLElement[]): SpeechChunk[] {
  const out: SpeechChunk[] = [];
  blocks.forEach((el, i) => {
    for (const text of chunkText(el.textContent ?? "")) {
      out.push({ text, el, group: `b${i}` });
    }
  });
  return out;
}

// Warm the browser's voice list as soon as this store is imported on the
// client, so `getVoices()` is populated well before the first read request
// (Chrome returns an empty list until voices finish loading asynchronously).
if (typeof window !== "undefined") {
  void loadVoices().then((v) => {
    voices = v;
  });
}

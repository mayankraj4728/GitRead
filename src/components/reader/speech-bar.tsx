"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, X, Minus, Plus, Volume2 } from "lucide-react";
import { useSpeech } from "@/stores/speech";
import { useReaderPrefs } from "@/stores/reader-prefs";
import { RATE_MAX, RATE_MIN, RATE_STEP, VOICE_OPTIONS } from "@/lib/speech";
import { cn } from "@/lib/utils";

/**
 * Floating playback controls, shown only while text-to-speech is active.
 * Sits above the mobile bottom-nav; centered on desktop.
 */
export function SpeechBar() {
  const status = useSpeech((s) => s.status);
  const index = useSpeech((s) => s.index);
  const total = useSpeech((s) => s.total);
  const source = useSpeech((s) => s.source);
  const pause = useSpeech((s) => s.pause);
  const resume = useSpeech((s) => s.resume);
  const stop = useSpeech((s) => s.stop);

  const voice = useReaderPrefs((s) => s.voice);
  const rate = useReaderPrefs((s) => s.speechRate);
  const setRate = useReaderPrefs((s) => s.setSpeechRate);

  const playing = status === "speaking";
  const voiceLabel = VOICE_OPTIONS.find((v) => v.key === voice)?.label ?? "Voice";
  const pct = total > 0 ? Math.round(((index + 1) / total) * 100) : 0;

  return (
    <AnimatePresence>
      {status !== "idle" && (
        <motion.div
          role="region"
          aria-label="Read aloud controls"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="fixed inset-x-0 bottom-20 z-50 mx-auto flex w-max max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-full border border-border bg-popover/95 px-2 py-1.5 shadow-xl backdrop-blur lg:bottom-6"
        >
          <button
            onClick={playing ? pause : resume}
            aria-label={playing ? "Pause" : "Resume"}
            className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground transition-transform hover:scale-105"
          >
            {playing ? <Pause className="size-4" /> : <Play className="size-4 translate-x-px" />}
          </button>

          <div className="flex min-w-0 flex-col pr-1">
            <span className="flex items-center gap-1 text-xs font-medium text-foreground">
              <Volume2 className="size-3 shrink-0 text-muted-foreground" />
              <span className="truncate">
                {source === "selection" ? "Reading selection" : "Reading document"}
              </span>
            </span>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {voiceLabel} · {pct}%
            </span>
          </div>

          <div className="flex items-center gap-0.5 rounded-full border border-border px-1">
            <RateBtn
              onClick={() => setRate(rate - RATE_STEP)}
              disabled={rate <= RATE_MIN + 1e-9}
              label="Slower"
            >
              <Minus className="size-3.5" />
            </RateBtn>
            <span className="w-9 text-center text-xs tabular-nums text-muted-foreground">
              {rate.toFixed(1)}×
            </span>
            <RateBtn
              onClick={() => setRate(rate + RATE_STEP)}
              disabled={rate >= RATE_MAX - 1e-9}
              label="Faster"
            >
              <Plus className="size-3.5" />
            </RateBtn>
          </div>

          <button
            onClick={stop}
            aria-label="Stop reading"
            className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function RateBtn({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "grid size-6 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground",
        "disabled:pointer-events-none disabled:opacity-40",
      )}
    >
      {children}
    </button>
  );
}

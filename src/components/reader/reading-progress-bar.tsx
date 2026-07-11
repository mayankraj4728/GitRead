"use client";

/** Thin sticky bar under the topbar reflecting scroll progress (0–1). */
export function ReadingProgressBar({ progress }: { progress: number }) {
  return (
    <div className="reading-progress sticky top-14 z-20 h-0.5 w-full bg-transparent">
      <div
        className="h-full bg-accent transition-[width] duration-150 ease-out"
        style={{ width: `${Math.round(progress * 100)}%` }}
      />
    </div>
  );
}

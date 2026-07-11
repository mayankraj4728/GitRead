"use client";

import { useRef, useState } from "react";
import { Type, Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClickOutside } from "@/hooks/use-click-outside";
import { useReaderPrefs, type ReadingWidth, type ReadingFont } from "@/stores/reader-prefs";
import { cn } from "@/lib/utils";

/** Popover with typography controls: size, line height, width, font. */
export function ReadingControls() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  const p = useReaderPrefs();

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Reading settings"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Type className="size-4" />
      </Button>

      {open && (
        <div className="absolute right-0 top-11 z-40 w-64 rounded-xl border border-border bg-popover p-4 shadow-lg animate-fade-in">
          <Row label="Text size">
            <Stepper
              onDec={() => p.setFontScale(p.fontScale - 0.05)}
              onInc={() => p.setFontScale(p.fontScale + 0.05)}
              value={`${Math.round(p.fontScale * 100)}%`}
            />
          </Row>
          <Row label="Line height">
            <Stepper
              onDec={() => p.setLineHeight(p.lineHeight - 0.1)}
              onInc={() => p.setLineHeight(p.lineHeight + 0.1)}
              value={p.lineHeight.toFixed(1)}
            />
          </Row>
          <Row label="Width">
            <Segmented<ReadingWidth>
              options={[
                ["narrow", "S"],
                ["normal", "M"],
                ["wide", "L"],
              ]}
              value={p.width}
              onChange={p.setWidth}
            />
          </Row>
          <Row label="Font">
            <Segmented<ReadingFont>
              options={[
                ["serif", "Serif"],
                ["sans", "Sans"],
              ]}
              value={p.font}
              onChange={p.setFont}
            />
          </Row>
          <button
            onClick={p.reset}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <RotateCcw className="size-3" /> Reset to defaults
          </button>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function Stepper({
  onDec,
  onInc,
  value,
}: {
  onDec: () => void;
  onInc: () => void;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1 rounded-md border border-border">
      <IconBtn onClick={onDec} label="Decrease">
        <Minus className="size-3.5" />
      </IconBtn>
      <span className="w-10 text-center text-xs tabular-nums">{value}</span>
      <IconBtn onClick={onInc} label="Increase">
        <Plus className="size-3.5" />
      </IconBtn>
    </div>
  );
}

function IconBtn({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="grid size-7 place-items-center text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
    </button>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<[T, string]>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-border p-0.5">
      {options.map(([val, label]) => (
        <button
          key={val}
          onClick={() => onChange(val)}
          className={cn(
            "rounded px-2.5 py-1 text-xs transition-colors",
            value === val ? "bg-muted font-medium text-foreground" : "text-muted-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
